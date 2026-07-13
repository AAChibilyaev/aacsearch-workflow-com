import ApiCall from './ApiCall';
import Stopwords from './Stopwords';
import type { StopwordsSetSchema } from './Types';

export default class Stopword {
  constructor(private id: string, private apiCall: ApiCall) {}

  async retrieve(): Promise<StopwordsSetSchema> {
    return this.apiCall.get<StopwordsSetSchema>(`${Stopwords.RESOURCEPATH}/${encodeURIComponent(this.id)}`);
  }

  async delete(): Promise<{ id: string }> {
    return this.apiCall.delete<{ id: string }>(`${Stopwords.RESOURCEPATH}/${encodeURIComponent(this.id)}`);
  }
}
