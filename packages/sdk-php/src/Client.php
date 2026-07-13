<?php

declare(strict_types=1);

namespace AACSearch\SDK;

use AACSearch\SDK\Collections\Collections;
use AACSearch\SDK\Collections\Collection;
use AACSearch\SDK\Aliases\Aliases;
use AACSearch\SDK\Aliases\Alias;
use AACSearch\SDK\Keys\Keys;
use AACSearch\SDK\Keys\Key;
use AACSearch\SDK\Synonyms\SynonymSets;
use AACSearch\SDK\Synonyms\SynonymSet;
use AACSearch\SDK\Synonyms\Synonym;
use AACSearch\SDK\Overrides\Overrides;
use AACSearch\SDK\CurationSets\CurationSets;
use AACSearch\SDK\CurationSets\CurationSet;
use AACSearch\SDK\Analytics\Analytics;
use AACSearch\SDK\Analytics\AnalyticsV1;
use AACSearch\SDK\Analytics\AnalyticsRules;
use AACSearch\SDK\Analytics\AnalyticsRule;
use AACSearch\SDK\Analytics\AnalyticsEvents;
use AACSearch\SDK\Presets\Presets;
use AACSearch\SDK\Presets\Preset;
use AACSearch\SDK\Conversations\Conversations;
use AACSearch\SDK\Conversations\Conversation;
use AACSearch\SDK\NLSearch\NLSearchModels;
use AACSearch\SDK\NLSearch\NLSearchModel;
use AACSearch\SDK\Stemming\Stemming;
use AACSearch\SDK\Stopwords\Stopwords;
use AACSearch\SDK\Stopwords\Stopword;
use AACSearch\SDK\System\Health;
use AACSearch\SDK\System\Metrics;
use AACSearch\SDK\System\Stats;
use AACSearch\SDK\System\Debug;
use AACSearch\SDK\System\Operations;

/**
 * @phpstan-type Options array{
 *   apiKey: string,
 *   nodes: array<int, array{host:string, port?:int, protocol?:string, path?:string}>,
 *   connectionTimeoutSeconds?: int,
 *   numRetries?: int,
 *   retryIntervalSeconds?: int,
 *   sendApiKeyAsQueryParam?: bool,
 *   cacheSearchResultsForSeconds?: int,
 *   useServerSideSearchCache?: bool,
 *   additionalHeaders?: array<string,string>,
 * }
 */
class Client
{
    public readonly Configuration $configuration;
    public readonly ApiCall $apiCall;
    public readonly Debug $debug;
    public readonly Metrics $metrics;
    public readonly Stats $stats;
    public readonly Health $health;
    public readonly Operations $operations;
    public readonly MultiSearch $multiSearch;
    public readonly Analytics $analytics;
    public readonly AnalyticsV1 $analyticsV1;
    public readonly Stemming $stemming;

    private readonly Collections $collectionsObj;
    /** @var array<string, Collection> */
    private array $individualCollections = [];

    private readonly Aliases $aliasesObj;
    /** @var array<string, Alias> */
    private array $individualAliases = [];

    private readonly Keys $keysObj;
    /** @var array<int, Key> */
    private array $individualKeys = [];

    private readonly Presets $presetsObj;
    /** @var array<string, Preset> */
    private array $individualPresets = [];

    private readonly SynonymSets $synonymSetsObj;
    /** @var array<string, SynonymSet> */
    private array $individualSynonymSets = [];

    /** @var array<string, Synonym> */
    private array $individualSynonyms = [];

    private readonly CurationSets $curationSetsObj;
    /** @var array<string, CurationSet> */
    private array $individualCurationSets = [];

    private readonly Overrides $overridesObj;

    private readonly AnalyticsRules $analyticsRulesObj;
    /** @var array<string, AnalyticsRule> */
    private array $individualAnalyticsRules = [];

    private readonly AnalyticsEvents $analyticsEventsObj;

    private readonly Stopwords $stopwordsObj;
    /** @var array<string, Stopword> */
    private array $individualStopwords = [];

    private readonly Conversations $conversationsObj;
    /** @var array<string, Conversation> */
    private array $individualConversations = [];

    private readonly NLSearchModels $nlSearchModelsObj;
    /** @var array<string, NLSearchModel> */
    private array $individualNLSearchModels = [];

    /**
     * @param Options $options
     */
    public function __construct(array $options)
    {
        $options['sendApiKeyAsQueryParam'] = $options['sendApiKeyAsQueryParam'] ?? false;

        $this->configuration = new Configuration($options);
        $this->apiCall = new ApiCall($this->configuration);

        $this->debug = new Debug($this->apiCall);
        $this->metrics = new Metrics($this->apiCall);
        $this->stats = new Stats($this->apiCall);
        $this->health = new Health($this->apiCall);
        $this->operations = new Operations($this->apiCall);
        $this->multiSearch = new MultiSearch($this->apiCall, $this->configuration);

        $this->collectionsObj = new Collections($this->apiCall);
        $this->aliasesObj = new Aliases($this->apiCall);
        $this->keysObj = new Keys($this->apiCall);
        $this->presetsObj = new Presets($this->apiCall);
        $this->synonymSetsObj = new SynonymSets($this->apiCall);
        $this->curationSetsObj = new CurationSets($this->apiCall);
        $this->overridesObj = new Overrides($this->apiCall);

        $this->analyticsRulesObj = new AnalyticsRules($this->apiCall);
        $this->analyticsEventsObj = new AnalyticsEvents($this->apiCall);
        $this->analytics = new Analytics($this->apiCall);
        $this->analyticsV1 = new AnalyticsV1($this->apiCall);

        $this->stopwordsObj = new Stopwords($this->apiCall);
        $this->conversationsObj = new Conversations($this->apiCall);
        $this->nlSearchModelsObj = new NLSearchModels($this->apiCall);

        $this->stemming = new Stemming($this->apiCall);
    }

    // ─── Collections ──────────────────────────────────────────

    public function collections(?string $collectionName = null): Collections|Collection
    {
        if ($collectionName === null) {
            return $this->collectionsObj;
        }
        if (!isset($this->individualCollections[$collectionName])) {
            $this->individualCollections[$collectionName] = new Collection($collectionName, $this->apiCall, $this->configuration);
        }
        return $this->individualCollections[$collectionName];
    }

    // ─── Aliases ──────────────────────────────────────────────

    public function aliases(?string $aliasName = null): Aliases|Alias
    {
        if ($aliasName === null) {
            return $this->aliasesObj;
        }
        if (!isset($this->individualAliases[$aliasName])) {
            $this->individualAliases[$aliasName] = new Alias($aliasName, $this->apiCall);
        }
        return $this->individualAliases[$aliasName];
    }

    // ─── Keys ─────────────────────────────────────────────────

    public function keys(?int $id = null): Keys|Key
    {
        if ($id === null) {
            return $this->keysObj;
        }
        if (!isset($this->individualKeys[$id])) {
            $this->individualKeys[$id] = new Key($id, $this->apiCall);
        }
        return $this->individualKeys[$id];
    }

    // ─── Presets ──────────────────────────────────────────────

    public function presets(?string $presetName = null): Presets|Preset
    {
        if ($presetName === null) {
            return $this->presetsObj;
        }
        if (!isset($this->individualPresets[$presetName])) {
            $this->individualPresets[$presetName] = new Preset($presetName, $this->apiCall);
        }
        return $this->individualPresets[$presetName];
    }

    // ─── Synonym Sets ─────────────────────────────────────────

    public function synonymSets(?string $id = null): SynonymSets|SynonymSet
    {
        if ($id === null) {
            return $this->synonymSetsObj;
        }
        if (!isset($this->individualSynonymSets[$id])) {
            $this->individualSynonymSets[$id] = new SynonymSet($id, $this->apiCall);
        }
        return $this->individualSynonymSets[$id];
    }

    // ─── Curations / Overrides ────────────────────────────────

    public function curationSets(?string $id = null): CurationSets|CurationSet
    {
        if ($id === null) {
            return $this->curationSetsObj;
        }
        if (!isset($this->individualCurationSets[$id])) {
            $this->individualCurationSets[$id] = new CurationSet('', $id, $this->apiCall);
        }
        return $this->individualCurationSets[$id];
    }

    /** @deprecated use curationSets() */
    public function overrides(): Overrides
    {
        return $this->overridesObj;
    }

    // ─── Analytics Rules ──────────────────────────────────────

    public function analyticsRules(?string $name = null): AnalyticsRules|AnalyticsRule
    {
        if ($name === null) {
            return $this->analyticsRulesObj;
        }
        if (!isset($this->individualAnalyticsRules[$name])) {
            $this->individualAnalyticsRules[$name] = new AnalyticsRule($name, $this->apiCall);
        }
        return $this->individualAnalyticsRules[$name];
    }

    public function analyticsEvents(): AnalyticsEvents
    {
        return $this->analyticsEventsObj;
    }

    // ─── Stopwords ────────────────────────────────────────────

    public function stopwords(?string $id = null): Stopwords|Stopword
    {
        if ($id === null) {
            return $this->stopwordsObj;
        }
        if (!isset($this->individualStopwords[$id])) {
            $this->individualStopwords[$id] = new Stopword($id, $this->apiCall);
        }
        return $this->individualStopwords[$id];
    }

    // ─── Conversations ────────────────────────────────────────

    public function conversations(?string $id = null): Conversations|Conversation
    {
        if ($id === null) {
            return $this->conversationsObj;
        }
        if (!isset($this->individualConversations[$id])) {
            $this->individualConversations[$id] = new Conversation($id, $this->apiCall);
        }
        return $this->individualConversations[$id];
    }

    // ─── NL Search Models ─────────────────────────────────────

    public function nlSearchModels(?string $id = null): NLSearchModels|NLSearchModel
    {
        if ($id === null) {
            return $this->nlSearchModelsObj;
        }
        if (!isset($this->individualNLSearchModels[$id])) {
            $this->individualNLSearchModels[$id] = new NLSearchModel($id, $this->apiCall);
        }
        return $this->individualNLSearchModels[$id];
    }
}
