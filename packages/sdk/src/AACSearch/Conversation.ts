import ApiCall from './ApiCall';
import type { ConversationSchema } from './Types';

const RESOURCEPATH = '/conversations';

export default class Conversation {
  constructor(private id: string, private apiCall: ApiCall) {}

  async retrieve(): Promise<ConversationSchema> {
    return this.apiCall.get<ConversationSchema>(`${RESOURCEPATH}/${encodeURIComponent(this.id)}`);
  }

  async update(params: Partial<ConversationSchema>): Promise<ConversationSchema> {
    return this.apiCall.put<ConversationSchema>(`${RESOURCEPATH}/${encodeURIComponent(this.id)}`, params);
  }

  async delete(): Promise<{ id: string }> {
    return this.apiCall.delete<{ id: string }>(`${RESOURCEPATH}/${encodeURIComponent(this.id)}`);
  }
}
