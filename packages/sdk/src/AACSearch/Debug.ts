import ApiCall from './ApiCall';

export default class Debug {
  constructor(private apiCall: ApiCall) {}

  async retrieve(): Promise<Record<string, unknown>> {
    return this.apiCall.get<Record<string, unknown>>('/debug');
  }
}
