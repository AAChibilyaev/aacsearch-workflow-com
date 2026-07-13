import ApiCall from './ApiCall';
import type { ApiKeySchema, KeyDeleteSchema } from './Types';

const RESOURCEPATH = '/keys';

export class Key {
  constructor(private id: number, private apiCall: ApiCall) {}

  async retrieve(): Promise<ApiKeySchema> {
    return this.apiCall.get<ApiKeySchema>(this.endpointPath());
  }

  async delete(): Promise<KeyDeleteSchema> {
    return this.apiCall.delete<KeyDeleteSchema>(this.endpointPath());
  }

  private endpointPath(): string {
    return `${RESOURCEPATH}/${this.id}`;
  }
}

export class Keys {
  constructor(private apiCall: ApiCall) {}

  async create(schema: ApiKeySchema): Promise<ApiKeySchema> {
    return this.apiCall.post<ApiKeySchema>(RESOURCEPATH, schema);
  }

  async retrieve(): Promise<{ keys: ApiKeySchema[] }> {
    return this.apiCall.get<{ keys: ApiKeySchema[] }>(RESOURCEPATH);
  }

  async generateScopedSearchKey(
    searchKey: string,
    params: Record<string, unknown>,
  ): Promise<string> {
    return this.apiCall.post<string>(`${RESOURCEPATH}/scoped`, { search_key: searchKey, ...params });
  }
}
