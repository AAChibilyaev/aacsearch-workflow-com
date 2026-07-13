import Configuration from './Configuration';
import ApiCall from './ApiCall';
import MultiSearch from './MultiSearch';
import SearchOnlyCollection from './SearchOnlyCollection';
import type { ConfigurationOptions, DocumentSchema } from './Types';

export default class SearchClient {
  public readonly multiSearch: MultiSearch;
  private readonly configuration: Configuration;
  private readonly apiCall: ApiCall;
  private readonly individualCollections: Record<string, SearchOnlyCollection<DocumentSchema>>;

  constructor(options: ConfigurationOptions) {
    options.sendApiKeyAsQueryParam = options.sendApiKeyAsQueryParam ?? true;
    this.configuration = new Configuration(options);
    this.apiCall = new ApiCall(this.configuration);
    this.multiSearch = new MultiSearch(this.apiCall, this.configuration);
    this.individualCollections = {};
  }

  clearCache() {
    this.multiSearch.clearCache();
    Object.entries(this.individualCollections).forEach(([, collection]) => {
      collection.documents().clearCache();
    });
  }

  collections<T extends DocumentSchema>(collectionName: string): SearchOnlyCollection<T> {
    if (!collectionName) {
      throw new Error(
        'AACSearch.SearchClient only supports search operations, so the collectionName that needs to be searched must be specified. Use AACSearch.Client if you need to access the full collection object.'
      );
    }
    if (!this.individualCollections[collectionName]) {
      this.individualCollections[collectionName] = new SearchOnlyCollection(collectionName, this.apiCall, this.configuration);
    }
    return this.individualCollections[collectionName] as SearchOnlyCollection<T>;
  }
}
