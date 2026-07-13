import ApiCall from './ApiCall';
import type {
  CollectionCreateSchema,
  CollectionSchema,
  CollectionUpdateSchema,
  CollectionsRetrieveOptions,
  CollectionCreateOptions,
} from './Types';

export default class Collections {
  static RESOURCEPATH = '/collections';

  constructor(private apiCall: ApiCall) {}

  async create<Options extends CollectionCreateOptions>(
    schema: CollectionCreateSchema,
    options?: Options,
  ): Promise<CollectionSchema> {
    return this.apiCall.post<CollectionSchema>(Collections.RESOURCEPATH, schema, options as Record<string,unknown>);
  }

  async retrieve(options: CollectionsRetrieveOptions = {}): Promise<CollectionSchema[]> {
    return this.apiCall.get<CollectionSchema[]>(Collections.RESOURCEPATH, options as Record<string,unknown>);
  }

  async retrieveOne(name: string): Promise<CollectionSchema> {
    return this.apiCall.get<CollectionSchema>(`${Collections.RESOURCEPATH}/${encodeURIComponent(name)}`);
  }

  async update(name: string, schema: CollectionUpdateSchema): Promise<CollectionSchema> {
    return this.apiCall.patch<CollectionSchema>(`${Collections.RESOURCEPATH}/${encodeURIComponent(name)}`, schema);
  }

  async delete(name: string): Promise<CollectionSchema> {
    return this.apiCall.delete<CollectionSchema>(`${Collections.RESOURCEPATH}/${encodeURIComponent(name)}`);
  }
}
