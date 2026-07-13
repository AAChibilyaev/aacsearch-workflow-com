import ApiCall from './ApiCall';
import StemmingDictionaries from './StemmingDictionaries';
import StemmingDictionary from './StemmingDictionary';

export default class Stemming {
  static RESOURCEPATH = '/stemming';

  private readonly _dictionaries: StemmingDictionaries;
  private individualDictionaries: Record<string, StemmingDictionary> = {};

  constructor(private apiCall: ApiCall) {
    this._dictionaries = new StemmingDictionaries(this.apiCall);
  }

  async retrieve(): Promise<{ dictionaries: string[] }> {
    return this.apiCall.get<{ dictionaries: string[] }>(Stemming.RESOURCEPATH);
  }

  dictionaries(): StemmingDictionaries;
  dictionaries(id: string): StemmingDictionary;
  dictionaries(id?: string): StemmingDictionaries | StemmingDictionary {
    if (id === undefined) return this._dictionaries;
    if (!this.individualDictionaries[id]) {
      this.individualDictionaries[id] = new StemmingDictionary(id, this.apiCall);
    }
    return this.individualDictionaries[id];
  }
}
