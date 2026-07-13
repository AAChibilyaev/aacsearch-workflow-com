import ApiCall from './ApiCall';
import type { StemmingDictionarySchema } from './Types';

export default class StemmingDictionary {
  constructor(private id: string, private apiCall: ApiCall) {}

  async retrieve(): Promise<StemmingDictionarySchema> {
    return this.apiCall.get<StemmingDictionarySchema>(`/stemming/dictionaries/${encodeURIComponent(this.id)}`);
  }

  async delete(): Promise<{ id: string }> {
    return this.apiCall.delete<{ id: string }>(`/stemming/dictionaries/${encodeURIComponent(this.id)}`);
  }
}
