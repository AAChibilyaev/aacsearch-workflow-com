import ApiCall from './ApiCall';
import type { SynonymSchema } from './Types';

export default class SynonymSets {
  static RESOURCEPATH = '/synonyms';

  constructor(private apiCall: ApiCall) {}

  async create(schema: SynonymSchema): Promise<SynonymSchema> {
    return this.apiCall.post<SynonymSchema>(SynonymSets.RESOURCEPATH, schema);
  }

  async retrieve(): Promise<{ synonyms: SynonymSchema[] }> {
    return this.apiCall.get<{ synonyms: SynonymSchema[] }>(SynonymSets.RESOURCEPATH);
  }
}
