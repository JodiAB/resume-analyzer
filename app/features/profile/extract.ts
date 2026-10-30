import { retryableLoader } from '../../lib/retryable-loader';
import { emptyValues, validateSource, type Source, type Claim, type ClaimKind } from './schema';

export async function sha256(data: Uint8Array): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(data).buffer)), b => b.toString(16).padStart(2, '0')).join('');
}
export const textDigest = (pages: Source['pages']) => sha256(new TextEncoder().encode(JSON.stringify(pages)));
export async function makeSource(fileName: string, bytes: Uint8Array, texts: string[]): Promise<Source> {
  const pages = texts.map((text, i) => ({ page: i + 1, text }));
  return validateSource({ fileName, fileHash: await sha256(bytes), textHash: await textDigest(pages), pages });
}
export async function verifySource(source: Source): Promise<void> {
  validateSource(source);
  if (await textDigest(source.pages) !== source.textHash) throw new Error('Source text integrity check failed');
}
const load = retryableLoader(async () => {
  // @ts-expect-error upstream module path lacks declarations
  const lib = await import('pdfjs-dist/build/pdf.mjs');
  lib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  return lib;
});
export async function extractProfileSource(file: File): Promise<Source> {
  if (file.type !== 'application/pdf' || !file.size || file.size > 20 * 1024 * 1024) throw new Error('Select a PDF up to 20 MB');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const fileHash = await sha256(bytes);
  const lib = await load();
  const task = lib.getDocument({ data: bytes, isEvalSupported: false });
  try {
    const pdf = await task.promise;
    if (pdf.numPages < 1 || pdf.numPages > 50) throw new Error('CV page limit is 50');
    const texts: string[] = []; let total = 0;
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      const text = content.items.map((item: { str?: string; hasEOL?: boolean }) => typeof item.str === 'string' ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('').trim();
      total += text.length;
      if (text.length > 100000 || total > 300000) throw new Error('CV text limit exceeded');
      texts.push(text); page.cleanup();
    }
    const pages = texts.map((text, i) => ({ page: i + 1, text }));
    return validateSource({ fileName: file.name, fileHash, textHash: await textDigest(pages), pages });
  } finally { await task.destroy(); }
}
export function suggestClaims(source: Source): Claim[] {
  validateSource(source);
  const headings: Record<string, ClaimKind> = { employment: 'employment', 'professional experience': 'employment', 'work experience': 'employment', freelance: 'freelance', 'freelance experience': 'freelance', projects: 'project', 'personal projects': 'project', 'portfolio projects': 'project', skills: 'skill', 'technical skills': 'skill', education: 'education', certifications: 'certification' };
  const claims: Claim[] = []; let kind: ClaimKind | undefined;
  for (const page of source.pages) {
    for (const match of page.text.matchAll(/[^\n]+/g)) {
      const line = match[0].trim(); const heading = line.toLowerCase().replace(/:$/, '');
      if (headings[heading]) { kind = headings[heading]; continue; }
      if (!kind || !line || line.length > 2000 || claims.length >= 200) continue;
      // Unknown section headings stop classification rather than guessing their meaning.
      if (/^[A-Z][A-Z &]{2,}:?$/.test(line)) { kind = undefined; continue; }
      const start = match.index! + match[0].indexOf(line);
      const labels = kind === 'skill' ? line.split(/[,;•]/).map(s => s.trim()).filter(Boolean) : [line];
      for (const label of labels) {
        if (claims.length >= 200) break;
        const range = /\b(\d{4}(?:-\d{2}(?:-\d{2})?)?)\s*(?:to|–|—| - )\s*(present|\d{4}(?:-\d{2}(?:-\d{2})?)?)\b/i.exec(label);
        claims.push({ id: crypto.randomUUID(), kind, values: { ...emptyValues(), label, start: range?.[1] || '', end: range?.[2]?.toLowerCase() || '' }, evidence: { page: page.page, start, end: start + line.length, quote: line }, correctionReason: '', basis: null, confirmedAt: null });
      }
    }
  }
  return claims;
}
