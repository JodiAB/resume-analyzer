export class SourceError extends Error {
  constructor(public code: string, public retryAfter = 0) { super(code); }
}
export type PublicFetch = (url: string, options: RequestInit) => Promise<Response>;
const hosts = new Set(['boards-api.greenhouse.io','api.lever.co','api.ashbyhq.com']);
export function createPublicTransport(options: { fetch?: PublicFetch; maxBytes?: number; timeoutMs?: number } = {}) {
  const get = async (url: string): Promise<unknown> => {
    const u = new URL(url);
    if (u.protocol !== 'https:' || !hosts.has(u.hostname) || u.username || u.password || u.port || /[%\\]/.test(u.pathname)) throw new SourceError('UNSAFE_SOURCE_URL');
    const controller = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const work = async () => {
      const response = await (options.fetch || fetch)(u.href, { method: 'GET', redirect: 'error', credentials: 'omit', headers: { Accept: 'application/json' }, signal: controller.signal });
      if (response.status === 429) {
        const header = response.headers.get('retry-after') || '';
        const seconds = /^\d+$/.test(header) ? Number(header) : Math.ceil((Date.parse(header) - Date.now()) / 1000);
        throw new SourceError('RATE_LIMITED', Number.isFinite(seconds) ? Math.max(1, Math.min(3600, seconds)) : 60);
      }
      if (response.status === 404) throw new SourceError('NOT_FOUND');
      if (!response.ok || response.redirected) throw new SourceError('SOURCE_UNAVAILABLE');
      if (!response.headers.get('content-type')?.includes('application/json')) throw new SourceError('INVALID_SOURCE_FORMAT');
      const max = options.maxBytes ?? 5000000;
      if (Number(response.headers.get('content-length')) > max || !response.body) throw new SourceError('SOURCE_SIZE_LIMIT');
      reader = response.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
      while (true) {
        const part = await reader.read(); if (part.done) break;
        length += part.value.byteLength; if (length > max) throw new SourceError('SOURCE_SIZE_LIMIT'); chunks.push(part.value);
      }
      const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { throw new SourceError('INVALID_SOURCE_FORMAT'); }
    };
    try {
      return await Promise.race([work(), new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new SourceError('SOURCE_TIMEOUT')); }, options.timeoutMs ?? 8000); })]);
    } finally { clearTimeout(timer); controller.abort(); void reader?.cancel().catch(() => {}); }
  };
  return { get };
}
