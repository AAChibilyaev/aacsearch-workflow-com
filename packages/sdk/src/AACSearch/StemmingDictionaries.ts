import ApiCall from './ApiCall';
import type { StemmingDictionarySchema } from './Types';

export default class StemmingDictionaries {
  constructor(private apiCall: ApiCall) {}

  async upsert(id: string, body: { word: string; root: string }): Promise<StemmingDictionarySchema> {
    return this.apiCall.post<StemmingDictionarySchema>('/stemming/dictionaries', {
      id,
      words: [body],
    });
  }

  async retrieve(): Promise<{ dictionaries: string[] }> {
    return this.apiCall.get<{ dictionaries: string[] }>('/stemming/dictionaries');
  }
}
