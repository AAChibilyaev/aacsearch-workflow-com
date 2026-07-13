import ApiCall from './ApiCall';
import ConversationModels from './ConversationModels';
import ConversationModel from './ConversationModel';
import type { ConversationsRetrieveSchema } from './Types';

const RESOURCEPATH = '/conversations';

export default class Conversations {
  private readonly _models: ConversationModels;
  private readonly individualModels: Record<string, ConversationModel> = {};

  constructor(private readonly apiCall: ApiCall) {
    this._models = new ConversationModels(this.apiCall);
  }

  async retrieve(): Promise<ConversationsRetrieveSchema> {
    return this.apiCall.get<ConversationsRetrieveSchema>(RESOURCEPATH);
  }

  models(): ConversationModels;
  models(id: string): ConversationModel;
  models(id?: string): ConversationModels | ConversationModel {
    if (id === undefined) return this._models;
    if (!this.individualModels[id]) {
      this.individualModels[id] = new ConversationModel(id, this.apiCall);
    }
    return this.individualModels[id];
  }

  static get RESOURCEPATH() {
    return RESOURCEPATH;
  }
}
