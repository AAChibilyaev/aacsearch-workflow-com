import ApiCall from './ApiCall';
import type { ConversationModelSchema, ConversationModelDeleteSchema } from './Types';

const RESOURCEPATH = '/conversations/models';

export default class ConversationModel {
  constructor(private id: string, private apiCall: ApiCall) {}

  async retrieve(): Promise<ConversationModelSchema> {
    return this.apiCall.get<ConversationModelSchema>(`${RESOURCEPATH}/${encodeURIComponent(this.id)}`);
  }

  async update(params: Partial<ConversationModelSchema>): Promise<ConversationModelSchema> {
    return this.apiCall.put<ConversationModelSchema>(`${RESOURCEPATH}/${encodeURIComponent(this.id)}`, params);
  }

  async delete(): Promise<ConversationModelDeleteSchema> {
    return this.apiCall.delete<{ id: string }>(`${RESOURCEPATH}/${encodeURIComponent(this.id)}`);
  }
}
