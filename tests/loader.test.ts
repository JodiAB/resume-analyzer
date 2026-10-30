import { expect, it, vi } from 'vitest';
import { retryableLoader } from '../app/lib/retryable-loader';

it('retries a failed PDF dependency load and shares successful concurrent loads', async () => {
  const load = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValue({ version: 'pdf' });
  const get = retryableLoader(load);
  await expect(get()).rejects.toThrow('network');
  const [a, b] = await Promise.all([get(), get()]);
  expect(a).toBe(b); expect(await get()).toBe(a); expect(load).toHaveBeenCalledTimes(2);
});
