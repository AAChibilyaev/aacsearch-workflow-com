import ApiCall from './ApiCall';
import type { NLSearchModelCreateSchema, NLSearchModelSchema, NLSearchModelsRetrieveSchema } from './Types';

const RESOURCEPATH = '/nl_search/models';

export default class NLSearchModels {
  constructor(private apiCall: ApiCall) {}

  async create(schema: NLSearchModelCreateSchema): Promise<NLSearchModelSchema> {
    return this.apiCall.post<NLSearchModelSchema>(this.endpointPath(), schema);
  }

  async retrieve(): Promise<NLSearchModelsRetrieveSchema> {
    return this.apiCall.get<NLSearchModelsRetrieveSchema>(this.endpointPath());
  }

  private endpointPath(): string {
    return NLSearchModels.RESOURCEPATH;
  }

  static get RESOURCEPATH() {
    return RESOURCEPATH;
  }
}
