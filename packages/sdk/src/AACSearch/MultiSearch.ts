import ApiCall from './ApiCall';
import Configuration from './Configuration';
import type { DocumentSchema, MultiSearchRequestsSchema, MultiSearchResponse, SearchParams } from './Types';

export default class MultiSearch {
  clearCache() {
    // No-op for now
  }
  constructor(
    private apiCall: ApiCall,
    private configuration: Configuration,
  ) {}

  async perform<T extends DocumentSchema = DocumentSchema>(
    searchRequests: MultiSearchRequestsSchema,
    commonParams: Partial<SearchParams> = {},
  ): Promise<MultiSearchResponse<T>> {
    return this.apiCall.post<MultiSearchResponse<T>>(
      '/multi_search',
      searchRequests,
      commonParams as unknown as Record<string, unknown>,
    );
  }
}
