import ApiCall from './ApiCall';
import type { AnalyticsEventSchema } from './Types';

export default class AnalyticsEvents {
  constructor(private apiCall: ApiCall) {}

  async create(event: AnalyticsEventSchema): Promise<{ ok: boolean }> {
    return this.apiCall.post<{ ok: boolean }>('/analytics/events', event);
  }
}
