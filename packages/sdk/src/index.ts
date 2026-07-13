// AACSearch SDK v1 — native TypeScript/JavaScript Client

export { default as AACSearch, Client } from './AACSearch/Client';
export { default as SearchClient } from './AACSearch/SearchClient';
export { default as Configuration } from './AACSearch/Configuration';
export { default as ApiCall } from './AACSearch/ApiCall';
export { default as RequestWithCache } from './AACSearch/RequestWithCache';

export { default as Collections } from './AACSearch/Collections';
export { default as Collection } from './AACSearch/Collection';
export { default as SearchOnlyCollection } from './AACSearch/SearchOnlyCollection';
export { default as Documents } from './AACSearch/Documents';
export { default as Document } from './AACSearch/Document';
export { default as SearchOnlyDocuments } from './AACSearch/SearchOnlyDocuments';

import MultiSearch from './AACSearch/MultiSearch';
export { MultiSearch };

export { Aliases, Alias } from './AACSearch/Aliases';
export { Keys, Key } from './AACSearch/Keys';

export { default as Synonyms } from './AACSearch/Synonyms';
export { default as Synonym } from './AACSearch/Synonym';
export { default as SynonymSets } from './AACSearch/SynonymSets';
export { default as SynonymSet } from './AACSearch/SynonymSet';
export { default as SynonymSetItems } from './AACSearch/SynonymSetItems';
export { default as SynonymSetItem } from './AACSearch/SynonymSetItem';

export { Overrides, Override } from './AACSearch/Overrides';
export { default as CurationSets } from './AACSearch/CurationSets';
export { default as CurationSet } from './AACSearch/CurationSet';
export { default as CurationSetItems } from './AACSearch/CurationSetItems';
export { default as CurationSetItem } from './AACSearch/CurationSetItem';

export { Analytics, AnalyticsV1 } from './AACSearch/Analytics';
export { default as AnalyticsRules } from './AACSearch/AnalyticsRules';
export { default as AnalyticsRule } from './AACSearch/AnalyticsRule';
export { default as AnalyticsEvents } from './AACSearch/AnalyticsEvents';

export { Presets, Preset } from './AACSearch/Presets';

export { default as Conversations } from './AACSearch/Conversations';
export { default as Conversation } from './AACSearch/Conversation';
export { default as ConversationModels } from './AACSearch/ConversationModels';
export { default as ConversationModel } from './AACSearch/ConversationModel';

export { default as NLSearchModels } from './AACSearch/NLSearchModels';
export { default as NLSearchModel } from './AACSearch/NLSearchModel';

export { default as Stemming } from './AACSearch/Stemming';
export { default as StemmingDictionaries } from './AACSearch/StemmingDictionaries';
export { default as StemmingDictionary } from './AACSearch/StemmingDictionary';

export { default as Stopwords } from './AACSearch/Stopwords';
export { default as Stopword } from './AACSearch/Stopword';

export { default as Health } from './AACSearch/Health';
export { default as Metrics } from './AACSearch/Metrics';
export { default as Stats } from './AACSearch/Stats';
export { default as Debug } from './AACSearch/Debug';
export { default as Operations } from './AACSearch/Operations';

export { default as AACSearchError } from './AACSearch/Errors/AACSearchError';
export { default as HTTPError } from './AACSearch/Errors/HTTPError';
export { default as ObjectNotFound } from './AACSearch/Errors/ObjectNotFound';
export { default as ObjectAlreadyExists } from './AACSearch/Errors/ObjectAlreadyExists';
export { default as ObjectUnprocessable } from './AACSearch/Errors/ObjectUnprocessable';
export { default as RequestMalformed } from './AACSearch/Errors/RequestMalformed';
export { default as RequestUnauthorized } from './AACSearch/Errors/RequestUnauthorized';
export { default as ServerError } from './AACSearch/Errors/ServerError';
export { default as ImportError } from './AACSearch/Errors/ImportError';
export { default as MissingConfigurationError } from './AACSearch/Errors/MissingConfigurationError';

export type * from './AACSearch/Types';
