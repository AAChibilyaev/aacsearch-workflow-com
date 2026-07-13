import ApiCall from './ApiCall';
import type { CollectionAliasSchema, CollectionAliasCreateSchema } from './Types';

export class Alias {
  constructor(private name: string, private apiCall: ApiCall) {}

  async retrieve(): Promise<CollectionAliasSchema> {
    return this.apiCall.get<CollectionAliasSchema>(this.endpointPath());
  }

  async delete(): Promise<CollectionAliasSchema> {
    return this.apiCall.delete<CollectionAliasSchema>(this.endpointPath());
  }

  private endpointPath(): string {
    return `${Aliases.RESOURCEPATH}/${encodeURIComponent(this.name)}`;
  }
}

export class Aliases {
  static RESOURCEPATH = '/aliases';

  constructor(private apiCall: ApiCall) {}

  async upsert(
    name: string,
    mapping: CollectionAliasCreateSchema,
  ): Promise<CollectionAliasSchema> {
    return this.apiCall.put<CollectionAliasSchema>(
      this.endpointPath(name),
      mapping,
    );
  }

  async retrieve(): Promise<{ aliases: CollectionAliasSchema[] }> {
    return this.apiCall.get<{ aliases: CollectionAliasSchema[] }>(Aliases.RESOURCEPATH);
  }

  private endpointPath(aliasName: string): string {
    return `${Aliases.RESOURCEPATH}/${encodeURIComponent(aliasName)}`;
  }
}
