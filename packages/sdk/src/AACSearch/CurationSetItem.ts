import ApiCall from './ApiCall';
import type { OverrideSchema } from './Types';

export default class CurationSetItem {
  constructor(
    private collection: string,
    private curationId: string,
    private id: string,
    private apiCall: ApiCall,
  ) {}

  async retrieve(): Promise<OverrideSchema> {
    return this.apiCall.get<OverrideSchema>(this.endpointPath());
  }

  async delete(): Promise<{ id: string }> {
    return this.apiCall.delete<{ id: string }>(this.endpointPath());
  }

  private endpointPath(): string {
    return `/curations/${encodeURIComponent(this.collection)}/curations/${encodeURIComponent(this.curationId)}/items/${encodeURIComponent(this.id)}`;
  }
}
