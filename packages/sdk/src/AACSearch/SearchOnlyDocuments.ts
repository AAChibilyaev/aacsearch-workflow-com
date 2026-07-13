import ApiCall from './ApiCall';
import Configuration from './Configuration';
import RequestWithCache, { type CacheableRequestContext } from './RequestWithCache';
import type { DocumentSchema, SearchParams, SearchResponse } from './Types';

export default class SearchOnlyDocuments<T extends DocumentSchema = DocumentSchema> {
  protected requestWithCache: RequestWithCache;

  constructor(
    protected collectionName: string,
    protected apiCall: ApiCall,
    protected configuration: Configuration,
  ) {
    this.requestWithCache = new RequestWithCache();
  }

  clearCache() {
    this.requestWithCache.clearCache();
  }

  async search(
    params: SearchParams,
    options: { cacheSearchResultsForSeconds?: number } = {},
  ): Promise<SearchResponse<T>> {
    const path = `/collections/${encodeURIComponent(this.collectionName)}/documents/search`;
    const queryParams = params as unknown as Record<string, unknown>;

    if (options.cacheSearchResultsForSeconds !== undefined) {
      return this.requestWithCache.perform(
        this.apiCall as unknown as CacheableRequestContext,
        'get',
        { path, queryParams },
        { cacheResponseForSeconds: options.cacheSearchResultsForSeconds },
      ) as Promise<SearchResponse<T>>;
    }

    return this.apiCall.get<SearchResponse<T>>(path, queryParams);
  }

  protected endpointPath(): string {
    return `/collections/${encodeURIComponent(this.collectionName)}/documents`;
  }
}
