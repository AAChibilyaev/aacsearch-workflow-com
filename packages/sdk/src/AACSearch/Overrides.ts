import ApiCall from './ApiCall';
import type { OverrideSchema } from './Types';

export class Override {
  constructor(private collection: string, private apiCall: ApiCall) {}

  async list(): Promise<{ overrides: OverrideSchema[] }> {
    return this.apiCall.get<{ overrides: OverrideSchema[] }>(
      `/overrides/${encodeURIComponent(this.collection)}`,
    );
  }
}

export class Overrides {
  constructor(private apiCall: ApiCall) {}

  async upsert(collection: string, overrideId: string, schema: OverrideSchema): Promise<OverrideSchema> {
    return this.apiCall.put<OverrideSchema>(
      `/overrides/${encodeURIComponent(collection)}/${encodeURIComponent(overrideId)}`,
      schema,
    );
  }

  async retrieve(collection: string): Promise<{ overrides: OverrideSchema[] }> {
    return this.apiCall.get<{ overrides: OverrideSchema[] }>(
      `/overrides/${encodeURIComponent(collection)}`,
    );
  }
}
