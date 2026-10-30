// Share successful dependency loads without caching transient network failures.
export function retryableLoader<T>(load: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined;
  return () => {
    if (!pending) pending = load().catch(error => { pending = undefined; throw error; });
    return pending;
  };
}
