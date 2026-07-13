import ApiCall from './ApiCall';
import type { ConversationModelSchema, ConversationModelCreateSchema } from './Types';

const RESOURCEPATH = '/conversations/models';

export default class ConversationModels {
  constructor(private apiCall: ApiCall) {}

  async create(schema: ConversationModelCreateSchema): Promise<ConversationModelSchema> {
    return this.apiCall.post<ConversationModelSchema>(RESOURCEPATH, schema);
  }

  async retrieve(): Promise<{ models: ConversationModelSchema[] }> {
    return this.apiCall.get<{ models: ConversationModelSchema[] }>(RESOURCEPATH);
  }
}
