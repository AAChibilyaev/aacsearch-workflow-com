import ApiCall from './ApiCall';
import type { OverrideSchema } from './Types';

export default class CurationSetItems {
  constructor(private collection: string, private curationId: string, private apiCall: ApiCall) {}

  async create(params: OverrideSchema): Promise<OverrideSchema> {
    return this.apiCall.post<OverrideSchema>(this.endpointPath(), params);
  }

  async retrieve(): Promise<{ items: OverrideSchema[] }> {
    return this.apiCall.get<{ items: OverrideSchema[] }>(this.endpointPath());
  }

  private endpointPath(): string {
    return `/curations/${encodeURIComponent(this.collection)}/curations/${encodeURIComponent(this.curationId)}/items`;
  }
}
