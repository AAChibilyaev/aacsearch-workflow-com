import ApiCall from './ApiCall';
import type { AnalyticsRuleSchema, AnalyticsRuleCreateSchema, AnalyticsRuleUpsertSchema } from './Types';

export default class AnalyticsRules {
  static RESOURCEPATH = '/analytics/rules';

  constructor(private apiCall: ApiCall) {}

  async create(params: AnalyticsRuleCreateSchema | AnalyticsRuleCreateSchema[]): Promise<AnalyticsRuleSchema | AnalyticsRuleSchema[]> {
    return this.apiCall.post(this.endpointPath(), params);
  }

  async upsert(name: string, params: AnalyticsRuleUpsertSchema): Promise<AnalyticsRuleSchema> {
    return this.apiCall.put<AnalyticsRuleSchema>(this.endpointPath(name), params);
  }

  async retrieve(ruleTag?: string): Promise<AnalyticsRuleSchema[]> {
    const query = ruleTag ? { rule_tag: ruleTag } : {};
    return this.apiCall.get<AnalyticsRuleSchema[]>(this.endpointPath(), query);
  }

  private endpointPath(operation?: string): string {
    return `${AnalyticsRules.RESOURCEPATH}${operation ? '/' + encodeURIComponent(operation) : ''}`;
  }
}
