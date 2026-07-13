import ApiCall from './ApiCall';
import type { SynonymSchema } from './Types';

export default class Synonym {
  constructor(
    private collection: string,
    private id: string,
    private apiCall: ApiCall,
  ) {}

  async retrieve(): Promise<SynonymSchema> {
    return this.apiCall.get<SynonymSchema>(this.endpointPath());
  }

  async delete(): Promise<{ id: string }> {
    return this.apiCall.delete<{ id: string }>(this.endpointPath());
  }

  private endpointPath(): string {
    return `/synonyms/${encodeURIComponent(this.collection)}/synonyms/${encodeURIComponent(this.id)}`;
  }
}
