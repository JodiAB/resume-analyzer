// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
const render = vi.hoisted(() => vi.fn(() => ({ promise: Promise.resolve() })));
const destroy = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('pdfjs-dist/build/pdf.mjs', () => ({
  GlobalWorkerOptions: {}, getDocument: () => ({ destroy, promise: Promise.resolve({ numPages: 1, getPage: async () => ({
    getViewport: () => ({ width: 80000, height: 80000 }), render,
  }) }) }),
}));
import { convertPdfToImage } from '../app/lib/pdf2img';
afterEach(() => vi.unstubAllGlobals());
it('refuses an oversized page before allocating or rendering a canvas and releases the PDF task', async () => {
  const canvas = { width: 0, height: 0, getContext: () => ({}), toBlob: (callback: (blob: Blob) => void) => callback(new Blob(['png'])) };
  const createElement = vi.fn(() => canvas);
  vi.stubGlobal('document', { createElement });
  const result = await convertPdfToImage(new File(['synthetic'], 'oversized.pdf'));
  expect(result.file).toBeNull();
  expect(render).not.toHaveBeenCalled();
  expect(createElement).not.toHaveBeenCalled();
  expect(destroy).toHaveBeenCalledTimes(1);
});
