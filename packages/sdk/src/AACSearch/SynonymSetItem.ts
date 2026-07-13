import ApiCall from './ApiCall';
import SynonymSets from './SynonymSets';
import type { SynonymSchema } from './Types';

export default class SynonymSetItem {
  constructor(private synonymSetId: string, private id: string, private apiCall: ApiCall) {}

  async retrieve(): Promise<SynonymSchema> {
    return this.apiCall.get<SynonymSchema>(this.endpointPath());
  }

  async delete(): Promise<{ id: string }> {
    return this.apiCall.delete<{ id: string }>(this.endpointPath());
  }

  async update(body: { locale?: string; synonyms: string[] }): Promise<SynonymSchema> {
    return this.apiCall.put<SynonymSchema>(this.endpointPath(), body);
  }

  private endpointPath(): string {
    return `${SynonymSets.RESOURCEPATH}/${encodeURIComponent(this.synonymSetId)}/items/${encodeURIComponent(this.id)}`;
  }
}
