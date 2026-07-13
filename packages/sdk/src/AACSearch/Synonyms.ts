import ApiCall from './ApiCall';
import Synonym from './Synonym';
import type { SynonymSchema } from './Types';

const RESOURCEPATH = '/synonyms';

export default class Synonyms {
  constructor(private apiCall: ApiCall) {}

  async create(schema: SynonymSchema): Promise<SynonymSchema> {
    return this.apiCall.post<SynonymSchema>(RESOURCEPATH, schema);
  }

  async retrieve(): Promise<{ synonyms: SynonymSchema[] }> {
    return this.apiCall.get<{ synonyms: SynonymSchema[] }>(RESOURCEPATH);
  }

  static get RESOURCEPATH(): string {
    return RESOURCEPATH;
  }
}
