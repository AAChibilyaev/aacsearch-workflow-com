import ApiCall from './ApiCall';
import SynonymSetItems from './SynonymSetItems';
import SynonymSetItem from './SynonymSetItem';
import type { SynonymSchema } from './Types';

export default class SynonymSet {
  private readonly _items: SynonymSetItems;
  private individualItems: Record<string, SynonymSetItem> = {};

  constructor(private id: string, private apiCall: ApiCall) {
    this._items = new SynonymSetItems(this.id, this.apiCall);
  }

  items(): SynonymSetItems;
  items(itemId: string): SynonymSetItem;
  items(itemId?: string): SynonymSetItems | SynonymSetItem {
    if (itemId === undefined) return this._items;
    if (!this.individualItems[itemId]) {
      this.individualItems[itemId] = new SynonymSetItem(this.id, itemId, this.apiCall);
    }
    return this.individualItems[itemId];
  }

  async retrieve(): Promise<SynonymSchema> {
    return this.apiCall.get<SynonymSchema>(`/synonyms/${encodeURIComponent(this.id)}`);
  }

  async delete(): Promise<{ id: string }> {
    return this.apiCall.delete<{ id: string }>(`/synonyms/${encodeURIComponent(this.id)}`);
  }
}
