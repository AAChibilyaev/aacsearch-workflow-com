import ApiCall from './ApiCall';
import type { HealthResponse } from './Types';

export default class Health {
  constructor(private apiCall: ApiCall) {}

  async retrieve(): Promise<HealthResponse> {
    return this.apiCall.get<HealthResponse>('/health');
  }
}
