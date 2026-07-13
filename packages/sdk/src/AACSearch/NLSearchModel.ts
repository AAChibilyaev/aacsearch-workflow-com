import ApiCall from './ApiCall';
import type { NLSearchModelSchema } from './Types';

const RESOURCEPATH = '/nl_search/models';

export default class NLSearchModel {
  constructor(private id: string, private apiCall: ApiCall) {}

  async retrieve(): Promise<NLSearchModelSchema> {
    return this.apiCall.get<NLSearchModelSchema>(`${RESOURCEPATH}/${encodeURIComponent(this.id)}`);
  }

  async delete(): Promise<{ id: string }> {
    return this.apiCall.delete<{ id: string }>(`${RESOURCEPATH}/${encodeURIComponent(this.id)}`);
  }
}
