import ApiCall from './ApiCall';
import type { AnalyticsEventSchema, AnalyticsRuleSchema, AnalyticsRuleDeleteSchema } from './Types';

export class Analytics {
  constructor(private apiCall: ApiCall) {}

  async rules(): Promise<{ rules: AnalyticsRuleSchema[] }> {
    return this.apiCall.get<{ rules: AnalyticsRuleSchema[] }>('/analytics/rules');
  }

  async createRule(rule: AnalyticsRuleSchema): Promise<AnalyticsRuleSchema> {
    return this.apiCall.post<AnalyticsRuleSchema>('/analytics/rules', rule);
  }

  async deleteRule(name: string): Promise<AnalyticsRuleDeleteSchema> {
    return this.apiCall.delete<AnalyticsRuleDeleteSchema>(`/analytics/rules/${encodeURIComponent(name)}`);
  }
}

export class AnalyticsV1 {
  constructor(private apiCall: ApiCall) {}

  async sendEvent(event: AnalyticsEventSchema): Promise<{ ok: boolean }> {
    return this.apiCall.post<{ ok: boolean }>('/analytics/events', event);
  }
}
