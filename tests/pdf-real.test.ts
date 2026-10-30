// @vitest-environment node
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { convertPdfToImage } from '../app/lib/pdf2img';
import { extractProfileSource } from '../app/features/profile/extract';

const require = createRequire(import.meta.url);
const { createCanvas, loadImage, DOMMatrix, ImageData, Path2D } = require('@napi-rs/canvas');
let pdfjs: any;
const fixture = async (name: string) => new File([await readFile(resolve('tests/fixtures/pdf', name))], name, { type: 'application/pdf' });
beforeAll(async () => {
  vi.stubGlobal('DOMMatrix', DOMMatrix);
  vi.stubGlobal('ImageData', ImageData);
  vi.stubGlobal('Path2D', Path2D);
  // Real PDF.js parser and the actual shipped worker implementation, running
  // in Node's same-thread fallback. This is not a browser Worker/CORS test.
  // @ts-expect-error upstream path has no declaration file
  pdfjs = await import('pdfjs-dist/build/pdf.mjs');
  const worker = await import(/* @vite-ignore */ pathToFileURL(resolve('public/pdf.worker.min.mjs')).href);
  vi.stubGlobal('pdfjsWorker', worker);
  vi.stubGlobal('document', { createElement: () => {
    const canvas = createCanvas(1, 1);
    canvas.toBlob = (callback: (blob: Blob) => void) => callback(new Blob([canvas.toBuffer('image/png')], { type: 'image/png' }));
    return canvas;
  } });
});
afterAll(() => vi.unstubAllGlobals());

it('extracts both literal page sentinels with the real PDF parser', async () => {
  const task = pdfjs.getDocument({ data: new Uint8Array(await (await fixture('synthetic-two-page.pdf')).arrayBuffer()), useSystemFonts: true });
  try {
    const pdf = await task.promise;
    expect(pdf.numPages).toBe(2);
    const text: string[] = [];
    for (let page = 1; page <= pdf.numPages; page++) text.push((await (await pdf.getPage(page)).getTextContent()).items.map((item: any) => item.str ?? '').join(' '));
    expect(text[0]).toContain('SYNTHETIC ONLY - PAGE ONE - React fixture');
    expect(text[1]).toContain('SYNTHETIC ONLY - PAGE TWO - TypeScript fixture');
  } finally { await task.destroy(); }
});
it('extracts all profile pages through the production importer with source byte and text hashes', async () => {
  const source = await extractProfileSource(await fixture('synthetic-two-page.pdf'));
  expect(source.pages).toHaveLength(2);
  expect(source.pages[0].text).toContain('SYNTHETIC ONLY - PAGE ONE');
  expect(source.pages[1].text).toContain('SYNTHETIC ONLY - PAGE TWO');
  expect(source.fileHash).toBe('da1b19f610a34962d9c5561402ba6cff0b75193b43c2f8b282ecb935410b6c55');
});
it.each(['scan-no-text.pdf', 'encrypted.pdf', 'malformed.pdf'])('profile importer rejects %s then recovers with the original readable fixture', async name => {
  await expect(extractProfileSource(await fixture(name))).rejects.toThrow();
  expect((await extractProfileSource(await fixture('synthetic-two-page.pdf'))).pages).toHaveLength(2);
});
it('recognizes a scan without inventing a text layer', async () => {
  const task = pdfjs.getDocument({ data: new Uint8Array(await (await fixture('scan-no-text.pdf')).arrayBuffer()) });
  try {
    const content = await (await (await task.promise).getPage(1)).getTextContent();
    expect(content.items).toHaveLength(0);
  } finally { await task.destroy(); }
});
it('renders an actual PDF preview through the app converter with a native canvas', async () => {
  const result = await convertPdfToImage(await fixture('synthetic-two-page.pdf'));
  expect(result.error).toBeUndefined(); expect(result.file?.type).toBe('image/png');
  expect(result.file!.size).toBeGreaterThan(1000);
  const bytes = new Uint8Array(await result.file!.arrayBuffer());
  expect([...bytes.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  const image = await loadImage(Buffer.from(bytes));
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, image.width, image.height).data;
  let dark = 0;
  for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] > 0 && pixels[i] < 200 && pixels[i + 1] < 200 && pixels[i + 2] < 200) dark++;
  expect(dark).toBeGreaterThan(1000);
  URL.revokeObjectURL(result.imageUrl);
});
it.each(['malformed.pdf', 'encrypted.pdf'])('fails safely for %s then recovers with a valid PDF', async name => {
  const bad = await convertPdfToImage(await fixture(name));
  expect(bad.file).toBeNull(); expect(bad.error).toBeTruthy();
  const good = await convertPdfToImage(await fixture('synthetic-two-page.pdf'));
  expect(good.file?.type).toBe('image/png'); URL.revokeObjectURL(good.imageUrl);
});
it('rejects the real oversized-page fixture without attempting a huge render', async () => {
  const result = await convertPdfToImage(await fixture('oversized-page.pdf'));
  expect(result.file).toBeNull(); expect(result.error).toContain('limit');
});
