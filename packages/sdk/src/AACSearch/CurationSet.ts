import ApiCall from './ApiCall';
import CurationSetItems from './CurationSetItems';
import CurationSetItem from './CurationSetItem';
import type { OverrideSchema } from './Types';

export default class CurationSet {
  private readonly _items: CurationSetItems;
  private individualItems: Record<string, CurationSetItem> = {};

  constructor(private collection: string, private id: string, private apiCall: ApiCall) {
    this._items = new CurationSetItems(this.collection, this.id, this.apiCall);
  }

  items(): CurationSetItems;
  items(itemId: string): CurationSetItem;
  items(itemId?: string): CurationSetItems | CurationSetItem {
    if (itemId === undefined) return this._items;
    if (!this.individualItems[itemId]) {
      this.individualItems[itemId] = new CurationSetItem(this.collection, this.id, itemId, this.apiCall);
    }
    return this.individualItems[itemId];
  }

  async retrieve(): Promise<OverrideSchema> {
    return this.apiCall.get<OverrideSchema>(this.endpointPath());
  }

  async delete(): Promise<{ id: string }> {
    return this.apiCall.delete<{ id: string }>(this.endpointPath());
  }

  private endpointPath(): string {
    return `/curations/${encodeURIComponent(this.collection)}/curations/${encodeURIComponent(this.id)}`;
  }
}
