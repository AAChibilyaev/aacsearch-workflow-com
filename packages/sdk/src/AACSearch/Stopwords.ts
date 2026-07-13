import ApiCall from './ApiCall';
import type { StopwordsSetSchema } from './Types';

export default class Stopwords {
  static RESOURCEPATH = '/stopwords';

  constructor(private apiCall: ApiCall) {}

  async upsert(stopwordId: string, params: { stopwords: string[]; locale?: string }): Promise<StopwordsSetSchema> {
    return this.apiCall.put<StopwordsSetSchema>(`${Stopwords.RESOURCEPATH}/${encodeURIComponent(stopwordId)}`, params);
  }

  async retrieve(): Promise<{ stopwords: StopwordsSetSchema[] }> {
    return this.apiCall.get<{ stopwords: StopwordsSetSchema[] }>(Stopwords.RESOURCEPATH);
  }
}
