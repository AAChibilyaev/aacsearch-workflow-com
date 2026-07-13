import Configuration from './Configuration';
import ApiCall from './ApiCall';
import Collections from './Collections';
import Collection from './Collection';
import { Aliases, Alias } from './Aliases';
import { Keys, Key } from './Keys';
import SynonymSets from './SynonymSets';
import SynonymSet from './SynonymSet';
import Synonym from './Synonym';
import { Overrides as OverrideOps } from './Overrides';
import CurationSets from './CurationSets';
import CurationSet from './CurationSet';
import { Analytics, AnalyticsV1 } from './Analytics';
import AnalyticsRules from './AnalyticsRules';
import AnalyticsRule from './AnalyticsRule';
import AnalyticsEvents from './AnalyticsEvents';
import { Presets, Preset } from './Presets';
import MultiSearch from './MultiSearch';
import Debug from './Debug';
import Metrics from './Metrics';
import Stats from './Stats';
import Health from './Health';
import Operations from './Operations';
import Stemming from './Stemming';
import Stopwords from './Stopwords';
import Stopword from './Stopword';
import Conversations from './Conversations';
import Conversation from './Conversation';
import NLSearchModels from './NLSearchModels';
import NLSearchModel from './NLSearchModel';
import SearchClient from './SearchClient';
import type { ConfigurationOptions, DocumentSchema, SearchResponse } from './Types';

export default class Client {
  configuration: Configuration;
  apiCall: ApiCall;
  debug: Debug;
  metrics: Metrics;
  stats: Stats;
  health: Health;
  operations: Operations;
  multiSearch: MultiSearch;
  analytics: Analytics;
  analyticsV1: AnalyticsV1;
  stemming: Stemming;

  private readonly _collections: Collections;
  private individualCollections: Record<string, Collection> = {};

  private readonly _aliases: Aliases;
  private individualAliases: Record<string, Alias> = {};

  private readonly _keys: Keys;
  private individualKeys: Record<number, Key> = {};

  private readonly _presets: Presets;
  private individualPresets: Record<string, Preset> = {};

  private readonly _synonymSets: SynonymSets;
  private individualSynonymSets: Record<string, SynonymSet> = {};

  private readonly _synonyms: Record<string, Synonym> = {};

  private readonly _curationSets: CurationSets;
  private individualCurationSets: Record<string, CurationSet> = {};

  private readonly _overrideOps: OverrideOps;

  private readonly _analyticsRules: AnalyticsRules;
  private individualAnalyticsRules: Record<string, AnalyticsRule> = {};

  private readonly _analyticsEvents: AnalyticsEvents;

  private readonly _stopwords: Stopwords;
  private individualStopwords: Record<string, Stopword> = {};

  private readonly _conversations: Conversations;
  private individualConversations: Record<string, Conversation> = {};

  private readonly _nlSearchModels: NLSearchModels;
  private individualNLSearchModels: Record<string, NLSearchModel> = {};

  constructor(options: ConfigurationOptions) {
    options.sendApiKeyAsQueryParam = options.sendApiKeyAsQueryParam ?? false;

    this.configuration = new Configuration(options);
    this.apiCall = new ApiCall(this.configuration);

    this.debug = new Debug(this.apiCall);
    this.metrics = new Metrics(this.apiCall);
    this.stats = new Stats(this.apiCall);
    this.health = new Health(this.apiCall);
    this.operations = new Operations(this.apiCall);
    this.multiSearch = new MultiSearch(this.apiCall, this.configuration);

    this._collections = new Collections(this.apiCall);
    this._aliases = new Aliases(this.apiCall);
    this._keys = new Keys(this.apiCall);
    this._presets = new Presets(this.apiCall);
    this._synonymSets = new SynonymSets(this.apiCall);
    this._curationSets = new CurationSets(this.apiCall);
    this._overrideOps = new OverrideOps(this.apiCall);

    this._analyticsRules = new AnalyticsRules(this.apiCall);
    this._analyticsEvents = new AnalyticsEvents(this.apiCall);
    this.analytics = new Analytics(this.apiCall);
    this.analyticsV1 = new AnalyticsV1(this.apiCall);

    this._stopwords = new Stopwords(this.apiCall);
    this._conversations = new Conversations(this.apiCall);
    this._nlSearchModels = new NLSearchModels(this.apiCall);

    this.stemming = new Stemming(this.apiCall);
  }

  // ─── Collections ──────────────────────────────────────────

  collections(): Collections;
  collections<T extends DocumentSchema = DocumentSchema>(collectionName: string): Collection<T>;
  collections<T extends DocumentSchema = DocumentSchema>(collectionName?: string): Collections | Collection<T> {
    if (collectionName === undefined) return this._collections;
    if (!this.individualCollections[collectionName]) {
      this.individualCollections[collectionName] = new Collection(collectionName, this.apiCall, this.configuration);
    }
    return this.individualCollections[collectionName] as Collection<T>;
  }

  // ─── Aliases ──────────────────────────────────────────────

  aliases(): Aliases;
  aliases(aliasName: string): Alias;
  aliases(aliasName?: string): Aliases | Alias {
    if (aliasName === undefined) return this._aliases;
    if (!this.individualAliases[aliasName]) {
      this.individualAliases[aliasName] = new Alias(aliasName, this.apiCall);
    }
    return this.individualAliases[aliasName];
  }

  // ─── Keys ─────────────────────────────────────────────────

  keys(): Keys;
  keys(id: number): Key;
  keys(id?: number): Keys | Key {
    if (id === undefined) return this._keys;
    if (!this.individualKeys[id]) {
      this.individualKeys[id] = new Key(id, this.apiCall);
    }
    return this.individualKeys[id];
  }

  // ─── Presets ──────────────────────────────────────────────

  presets(): Presets;
  presets(presetName: string): Preset;
  presets(presetName?: string): Presets | Preset {
    if (presetName === undefined) return this._presets;
    if (!this.individualPresets[presetName]) {
      this.individualPresets[presetName] = new Preset(presetName, this.apiCall);
    }
    return this.individualPresets[presetName];
  }

  // ─── Synonym Sets ─────────────────────────────────────────

  synonymSets(): SynonymSets;
  synonymSets(id: string): SynonymSet;
  synonymSets(id?: string): SynonymSets | SynonymSet {
    if (id === undefined) return this._synonymSets;
    if (!this.individualSynonymSets[id]) {
      this.individualSynonymSets[id] = new SynonymSet(id, this.apiCall);
    }
    return this.individualSynonymSets[id];
  }

  // ─── Curations / Overrides ────────────────────────────────

  curationSets(): CurationSets;
  curationSets(id: string): CurationSet;
  curationSets(id?: string): CurationSets | CurationSet {
    if (id === undefined) return this._curationSets;
    if (!this.individualCurationSets[id]) {
      this.individualCurationSets[id] = new CurationSet(id, '', this.apiCall);
    }
    return this.individualCurationSets[id];
  }

  /** @deprecated use curationSets() */
  overrides(): OverrideOps {
    return this._overrideOps;
  }

  // ─── Analytics Rules ──────────────────────────────────────

  analyticsRules(): AnalyticsRules;
  analyticsRules(name: string): AnalyticsRule;
  analyticsRules(name?: string): AnalyticsRules | AnalyticsRule {
    if (name === undefined) return this._analyticsRules;
    if (!this.individualAnalyticsRules[name]) {
      this.individualAnalyticsRules[name] = new AnalyticsRule(name, this.apiCall);
    }
    return this.individualAnalyticsRules[name];
  }

  analyticsEvents(): AnalyticsEvents {
    return this._analyticsEvents;
  }

  // ─── Stopwords ────────────────────────────────────────────

  stopwords(): Stopwords;
  stopwords(id: string): Stopword;
  stopwords(id?: string): Stopwords | Stopword {
    if (id === undefined) return this._stopwords;
    if (!this.individualStopwords[id]) {
      this.individualStopwords[id] = new Stopword(id, this.apiCall);
    }
    return this.individualStopwords[id];
  }

  // ─── Conversations ────────────────────────────────────────

  conversations(): Conversations;
  conversations(id: string): Conversation;
  conversations(id?: string): Conversations | Conversation {
    if (id === undefined) return this._conversations;
    if (!this.individualConversations[id]) {
      this.individualConversations[id] = new Conversation(id, this.apiCall);
    }
    return this.individualConversations[id];
  }

  // ─── NL Search Models ─────────────────────────────────────

  nlSearchModels(): NLSearchModels;
  nlSearchModels(id: string): NLSearchModel;
  nlSearchModels(id?: string): NLSearchModels | NLSearchModel {
    if (id === undefined) return this._nlSearchModels;
    if (!this.individualNLSearchModels[id]) {
      this.individualNLSearchModels[id] = new NLSearchModel(id, this.apiCall);
    }
    return this.individualNLSearchModels[id];
  }

  // ─── Search (backward compat) ─────────────────────────────

  /** @deprecated use client.collections(collectionName).documents.search() */
  async search<T extends DocumentSchema = DocumentSchema>(
    collectionName: string,
    params: Parameters<Collection<T>['search']>[0],
  ): Promise<SearchResponse<T>> {
    return this.collections<T>(collectionName).search(params);
  }

  // ─── SearchClient helper ──────────────────────────────────

  static SearchClient = SearchClient;
}

export { Client };
