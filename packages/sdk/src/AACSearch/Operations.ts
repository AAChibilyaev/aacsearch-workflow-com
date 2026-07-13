import ApiCall from './ApiCall';

export default class Operations {
  constructor(private apiCall: ApiCall) {}

  async perform(action: 'vote' | 'snapshot' | 'cache/clear' | 'db/compact' = 'snapshot'): Promise<{ success: boolean }> {
    return this.apiCall.post<{ success: boolean }>(`/operations/${action}`);
  }
}
