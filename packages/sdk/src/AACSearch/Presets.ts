import ApiCall from './ApiCall';
import type { PresetSchema, SearchParams } from './Types';

const RESOURCEPATH = '/presets';

export class Preset {
  constructor(private name: string, private apiCall: ApiCall) {}

  async retrieve(): Promise<PresetSchema> {
    return this.apiCall.get<PresetSchema>(`${RESOURCEPATH}/${encodeURIComponent(this.name)}`);
  }

  async delete(): Promise<PresetSchema> {
    return this.apiCall.delete<PresetSchema>(`${RESOURCEPATH}/${encodeURIComponent(this.name)}`);
  }
}

export class Presets {
  constructor(private apiCall: ApiCall) {}

  async upsert(presetName: string, params: Partial<SearchParams>): Promise<PresetSchema> {
    return this.apiCall.put<PresetSchema>(
      `${RESOURCEPATH}/${encodeURIComponent(presetName)}`,
      params,
    );
  }

  async retrieve(): Promise<{ presets: PresetSchema[] }> {
    return this.apiCall.get<{ presets: PresetSchema[] }>(RESOURCEPATH);
  }
}
