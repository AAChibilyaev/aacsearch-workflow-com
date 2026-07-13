import ApiCall from './ApiCall';

export default class Metrics {
  constructor(private apiCall: ApiCall) {}

  async retrieve(): Promise<Record<string, string>> {
    return this.apiCall.get<Record<string, string>>('/metrics.json');
  }
}
