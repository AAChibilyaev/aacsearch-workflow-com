import ApiCall from './ApiCall';
import type { SynonymSchema } from './Types';

export default class SynonymSetItems {
  constructor(private synonymSetId: string, private apiCall: ApiCall) {}

  async create(params: { synonyms: string[]; locale?: string }): Promise<SynonymSchema> {
    return this.apiCall.post<SynonymSchema>(
      `/synonyms/${encodeURIComponent(this.synonymSetId)}/items`,
      params,
    );
  }

  async retrieve(): Promise<{ synonyms: SynonymSchema[] }> {
    return this.apiCall.get<{ synonyms: SynonymSchema[] }>(
      `/synonyms/${encodeURIComponent(this.synonymSetId)}/items`,
    );
  }
}
