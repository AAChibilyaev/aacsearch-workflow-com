import ApiCall from './ApiCall';
import type { OverrideSchema } from './Types';

export default class CurationSets {
  static RESOURCEPATH = '/curations';

  constructor(private apiCall: ApiCall) {}

  async create(collection: string, params: OverrideSchema): Promise<OverrideSchema> {
    return this.apiCall.post<OverrideSchema>(
      `${CurationSets.RESOURCEPATH}/${encodeURIComponent(collection)}/curations`,
      params,
    );
  }

  async retrieve(collection: string): Promise<{ curations: OverrideSchema[] }> {
    return this.apiCall.get<{ curations: OverrideSchema[] }>(
      `${CurationSets.RESOURCEPATH}/${encodeURIComponent(collection)}/curations`,
    );
  }
}
