import ApiCall from './ApiCall';

export default class Stats {
  constructor(private apiCall: ApiCall) {}

  async retrieve(): Promise<Record<string, number>> {
    return this.apiCall.get<Record<string, number>>('/stats.json');
  }
}
