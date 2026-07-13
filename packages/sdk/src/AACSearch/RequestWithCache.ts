export default class RequestWithCache {
  private responseCache: Map<string, { timestamp: number; response: unknown }> = new Map();
  private promiseCache: Map<string, { timestamp: number; promise: Promise<unknown> }> = new Map();

  clearCache() {
    this.responseCache = new Map();
    this.promiseCache = new Map();
  }

  async perform<T>(
    context: any,
    methodName: string,
    params: { path: string; queryParams?: Record<string,unknown>; body?: unknown },
    cacheOptions: { cacheResponseForSeconds?: number } = {},
  ): Promise<T> {
    const { cacheResponseForSeconds = 60 } = cacheOptions;
    if (cacheResponseForSeconds <= 0) {
      return context[methodName](params.path, params.queryParams, params.body) as Promise<T>;
    }

    const key = JSON.stringify({ method: methodName, ...params });
    const now = Date.now();

    const cached = this.responseCache.get(key);
    if (cached && now - cached.timestamp < cacheResponseForSeconds * 1000) {
      return cached.response as T;
    }

    const promise = context[methodName](params.path, params.queryParams, params.body) as Promise<T>;
    this.promiseCache.set(key, { timestamp: now, promise });

    const response = await promise;
    this.responseCache.set(key, { timestamp: now, response });
    this.promiseCache.delete(key);

    return response;
  }
}
