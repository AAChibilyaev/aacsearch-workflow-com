import ApiCall from './ApiCall';
import Configuration from './Configuration';
import SearchOnlyDocuments from './SearchOnlyDocuments';
import type { DocumentSchema, SearchParams, SearchResponse } from './Types';

export default class SearchOnlyCollection<T extends DocumentSchema = DocumentSchema> {
  private readonly _documents: SearchOnlyDocuments<T>;

  constructor(
    private name: string,
    private apiCall: ApiCall,
    private configuration: Configuration,
  ) {
    this._documents = new SearchOnlyDocuments<T>(name, apiCall, configuration);
  }

  documents(): SearchOnlyDocuments<T> {
    return this._documents;
  }

  async retrieve(): Promise<Record<string,unknown>> {
    return this.apiCall.get<Record<string,unknown>>(
      `/collections/${encodeURIComponent(this.name)}`,
    );
  }
}
