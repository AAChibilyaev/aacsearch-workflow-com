import ApiCall from './ApiCall';
import Configuration from './Configuration';
import type {
  CollectionSchema,
  CollectionUpdateSchema,
  CollectionDropFieldSchema,
  DocumentSchema,
  SearchParams,
  SearchResponse,
} from './Types';
import Documents from './Documents';

export default class Collection<T extends DocumentSchema = DocumentSchema> {
  private readonly _documents: Documents<T>;

  constructor(
    private name: string,
    private apiCall: ApiCall,
    private configuration: Configuration,
  ) {
    this._documents = new Documents<T>(name, apiCall, configuration);
  }

  get documents(): Documents<T> {
    return this._documents;
  }

  async retrieve(): Promise<CollectionSchema> {
    return this.apiCall.get<CollectionSchema>(
      `/collections/${encodeURIComponent(this.name)}`,
    );
  }

  async update(schema: CollectionUpdateSchema): Promise<CollectionSchema> {
    return this.apiCall.patch<CollectionSchema>(
      `/collections/${encodeURIComponent(this.name)}`,
      schema,
    );
  }

  async dropField(fields: CollectionDropFieldSchema): Promise<CollectionSchema> {
    return this.apiCall.patch<CollectionSchema>(
      `/collections/${encodeURIComponent(this.name)}`,
      fields,
    );
  }

  async delete(): Promise<CollectionSchema> {
    return this.apiCall.delete<CollectionSchema>(
      `/collections/${encodeURIComponent(this.name)}`,
    );
  }

  async search(params: SearchParams): Promise<SearchResponse<T>> {
    return this.apiCall.get<SearchResponse<T>>(
      `/collections/${encodeURIComponent(this.name)}/documents/search`,
      params as unknown as Record<string, unknown>,
    );
  }
}
