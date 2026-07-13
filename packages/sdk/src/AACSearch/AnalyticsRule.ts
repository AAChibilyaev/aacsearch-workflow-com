import ApiCall from './ApiCall';
import AnalyticsRules from './AnalyticsRules';
import type { AnalyticsRuleSchema } from './Types';

export default class AnalyticsRule {
  constructor(private name: string, private apiCall: ApiCall) {}

  async retrieve(): Promise<AnalyticsRuleSchema> {
    return this.apiCall.get<AnalyticsRuleSchema>(this.endpointPath());
  }

  async delete(): Promise<{ name: string }> {
    return this.apiCall.delete<{ name: string }>(this.endpointPath());
  }

  private endpointPath(): string {
    return `${AnalyticsRules.RESOURCEPATH}/${encodeURIComponent(this.name)}`;
  }
}
