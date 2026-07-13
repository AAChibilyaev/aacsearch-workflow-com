import ApiCall from './ApiCall';
import Configuration from './Configuration';
import SearchOnlyDocuments from './SearchOnlyDocuments';
import type {
  DocumentSchema,
  SearchParams,
  SearchResponse,
  DocumentWriteParameters,
  UpdateByFilterParameters,
  UpdateByFilterResponse,
  DeleteQuery,
  DeleteResponse,
  DocumentImportParameters,
  ImportError,
} from './Types';

export default class Documents<T extends DocumentSchema = DocumentSchema>
  extends SearchOnlyDocuments<T>
{
  static RESOURCEPATH = '/documents';

  constructor(
    collectionName: string,
    apiCall: ApiCall,
    configuration: Configuration,
  ) {
    super(collectionName, apiCall, configuration);
  }

  async create(
    document: T,
    options: Omit<DocumentWriteParameters, 'action'> = {},
  ): Promise<T> {
    if (!document) throw new Error('No document provided');
    return this.apiCall.post<T>(this.endpointPath(), document, options);
  }

  async upsert(
    document: T,
    options: Omit<DocumentWriteParameters, 'action'> = {},
  ): Promise<T> {
    if (!document) throw new Error('No document provided');
    return this.apiCall.post<T>(
      this.endpointPath(),
      document,
      { ...options, action: 'upsert' },
    );
  }

  async update(
    document: T,
    options: Omit<DocumentWriteParameters, 'action'>,
  ): Promise<T>;
  async update(
    document: Partial<T>,
    options: UpdateByFilterParameters,
  ): Promise<UpdateByFilterResponse>;
  async update(
    document: T | Partial<T>,
    options: Omit<DocumentWriteParameters, 'action'> | UpdateByFilterParameters = {},
  ): Promise<UpdateByFilterResponse | T> {
    if (!document) throw new Error('No document provided');

    if ((options as UpdateByFilterParameters).filter_by != null) {
      return this.apiCall.patch<UpdateByFilterResponse>(
        this.endpointPath(),
        document,
        options as Record<string,unknown>,
      );
    }
    return this.apiCall.post<T>(
      this.endpointPath(),
      document,
      { ...options, action: 'update' } as Record<string,unknown>,
    );
  }

  async emplace(
    document: T,
    options: Omit<DocumentWriteParameters, 'action'>,
  ): Promise<T>;
  async emplace(
    document: T,
    options: UpdateByFilterParameters,
  ): Promise<UpdateByFilterResponse>;
  async emplace(
    document: T,
    options: Omit<DocumentWriteParameters, 'action'> | UpdateByFilterParameters = {},
  ): Promise<UpdateByFilterResponse | T> {
    if (!document) throw new Error('No document provided');

    if ((options as UpdateByFilterParameters).filter_by != null) {
      return this.apiCall.patch<UpdateByFilterResponse>(
        this.endpointPath(),
        document,
        options as Record<string,unknown>,
      );
    }
    return this.apiCall.post<T>(
      this.endpointPath(),
      document,
      { ...options, action: 'emplace' } as Record<string,unknown>,
    );
  }

  async delete(query: DeleteQuery = {} as DeleteQuery): Promise<DeleteResponse<T>> {
    return this.apiCall.delete<DeleteResponse<T>>(this.endpointPath(), query as Record<string, unknown>);
  }

  async retrieve(id: string): Promise<T> {
    return this.apiCall.get<T>(`${this.endpointPath()}/${encodeURIComponent(id)}`);
  }

  async import(
    documents: T[] | string,
    options: DocumentImportParameters = {},
  ): Promise<ImportError[] | string> {
    if (typeof documents === 'string') {
      return this.apiCall.post<string>(
        `${this.endpointPath()}/import?action=${options.action || 'upsert'}`,
        documents,
        options as Record<string, unknown>,
      );
    }
    const ndjson = documents.map((d) => JSON.stringify(d)).join('\n');
    return this.apiCall.post<ImportError[]>(
      `${this.endpointPath()}/import?action=${options.action || 'upsert'}`,
      ndjson,
      options as Record<string, unknown>,
    );
  }

  async export(options: { include_fields?: string; exclude_fields?: string; filter_by?: string } = {}): Promise<string> {
    return this.apiCall.get<string>(`${this.endpointPath()}/export`, options as Record<string, unknown>);
  }

  async deleteByQuery(params: { filter_by: string; batch_size?: number }): Promise<{ num_deleted: number }> {
    return this.apiCall.delete<{ num_deleted: number }>(this.endpointPath(), params as Record<string, unknown>);
  }

  /** @deprecated use import() instead */
  async createMany(documents: T[], options: DocumentImportParameters = {}): Promise<ImportError[] | string> {
    return this.import(documents, options);
  }
}
