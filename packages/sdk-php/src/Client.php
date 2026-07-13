<?php
declare(strict_types=1);
namespace AACSearch\SDK;

/**
 * AACSearch PayloadCMS v3 PHP SDK.
 *
 * Minimal:
 *   $aac = new Client('aac_sk_live_...');
 *
 * Custom instance:
 *   $aac = new Client('aac_sk_...', 'https://my-instance.aacsearch.com');
 *
 * Full options:
 *   $aac = new Client(['apiKey' => '...', 'baseUrl' => '...', 'numRetries' => 5]);
 *
 * @property-read MultiSearch $multiSearch     Multi-search across collections
 * @property-read Search $search               PayloadCMS search gateway (multiSearch, scopedKey, health)
 * @property-read Integrations $integrations   White-label data connectors (catalog, connect, disconnect)
 * @property-read Billing $billing             White-label billing (plans, summary, events)
 * @property-read Analytics $analytics         Analytics rules
 * @property-read AnalyticsV1 $analyticsV1     Analytics events v1
 * @property-read Stemming $stemming           Stemming dictionaries
 * @property-read Health $health               Health check
 * @property-read Metrics $metrics             System metrics
 * @property-read Stats $stats                 Search stats
 * @property-read Debug $debug                 Debug info
 * @property-read Operations $operations       System operations (snapshot, cache/clear, db/compact)
 */
class Client
{
    /** @readonly */
    public readonly MultiSearch $multiSearch;
    /** @readonly */
    public readonly Search $search;
    /** @readonly */
    public readonly Integrations $integrations;
    /** @readonly */
    public readonly Billing $billing;
    /** @readonly */
    public readonly Analytics\Analytics $analytics;
    /** @readonly */
    public readonly Analytics\AnalyticsV1 $analyticsV1;
    /** @readonly */
    public readonly Stemming\Stemming $stemming;
    /** @readonly */
    public readonly System\Health $health;
    /** @readonly */
    public readonly System\Metrics $metrics;
    /** @readonly */
    public readonly System\Stats $stats;
    /** @readonly */
    public readonly System\Debug $debug;
    /** @readonly */
    public readonly System\Operations $operations;

    private readonly Configuration $config;
    private readonly ApiCall $api;

    private readonly Collections\Collections $collectionsObj;
    private readonly Aliases\Aliases $aliasesObj;
    private readonly Keys\Keys $keysObj;
    private readonly Presets\Presets $presetsObj;
    private readonly Synonyms\SynonymSets $synonymSetsObj;
    private readonly CurationSets\CurationSets $curationSetsObj;
    private readonly Overrides\Overrides $overridesObj;
    private readonly Analytics\AnalyticsRules $analyticsRulesObj;
    private readonly Analytics\AnalyticsEvents $analyticsEventsObj;
    private readonly Stopwords\Stopwords $stopwordsObj;
    private readonly Conversations\Conversations $conversationsObj;
    private readonly NLSearch\NLSearchModels $nlSearchModelsObj;

    /** @var array<string, Collections\Collection> */
    private array $individualCollections = [];
    /** @var array<string, Aliases\Alias> */
    private array $individualAliases = [];
    /** @var array<int, Keys\Key> */
    private array $individualKeys = [];
    /** @var array<string, Presets\Preset> */
    private array $individualPresets = [];
    /** @var array<string, Synonyms\SynonymSet> */
    private array $individualSynonymSets = [];
    /** @var array<string, CurationSets\CurationSet> */
    private array $individualCurationSets = [];
    /** @var array<string, Analytics\AnalyticsRule> */
    private array $individualAnalyticsRules = [];
    /** @var array<string, Stopwords\Stopword> */
    private array $individualStopwords = [];
    /** @var array<string, Conversations\Conversation> */
    private array $individualConversations = [];
    /** @var array<string, NLSearch\NLSearchModel> */
    private array $individualNLSearchModels = [];

    /**
     * @param string|array{apiKey:string, baseUrl?:string, tenantId?:string, timeoutSeconds?:int, numRetries?:int} $options
     * @param string|null $baseUrl   Custom instance URL (default: https://api.aacsearch.ru)
     * @param string|null $tenantId  Default workspace/tenant for billing & integrations
     */
    public function __construct(string|array $options, ?string $baseUrl = null, ?string $tenantId = null)
    {
        $this->config = new Configuration($options, $baseUrl, $tenantId);
        $this->api = new ApiCall($this->config);

        $this->multiSearch = new MultiSearch($this->api);
        $this->search = new Search($this->api);
        $this->integrations = new Integrations($this->api, $this->config);
        $this->billing = new Billing($this->api, $this->config);
        $this->analytics = new Analytics\Analytics($this->api);
        $this->analyticsV1 = new Analytics\AnalyticsV1($this->api);
        $this->stemming = new Stemming\Stemming($this->api);
        $this->health = new System\Health($this->api);
        $this->metrics = new System\Metrics($this->api);
        $this->stats = new System\Stats($this->api);
        $this->debug = new System\Debug($this->api);
        $this->operations = new System\Operations($this->api);

        $this->collectionsObj = new Collections\Collections($this->api);
        $this->aliasesObj = new Aliases\Aliases($this->api);
        $this->keysObj = new Keys\Keys($this->api);
        $this->presetsObj = new Presets\Presets($this->api);
        $this->synonymSetsObj = new Synonyms\SynonymSets($this->api);
        $this->curationSetsObj = new CurationSets\CurationSets($this->api);
        $this->overridesObj = new Overrides\Overrides($this->api);
        $this->analyticsRulesObj = new Analytics\AnalyticsRules($this->api);
        $this->analyticsEventsObj = new Analytics\AnalyticsEvents($this->api);
        $this->stopwordsObj = new Stopwords\Stopwords($this->api);
        $this->conversationsObj = new Conversations\Conversations($this->api);
        $this->nlSearchModelsObj = new NLSearch\NLSearchModels($this->api);
    }

    // ── Collections ────────────────────────────────────────
    /** @return Collections\Collections|Collections\Collection */
    public function collections(?string $name = null): Collections\Collections|Collections\Collection {
        if ($name === null) return $this->collectionsObj;
        return $this->individualCollections[$name] ??= new Collections\Collection($name, $this->api, $this->config);
    }

    // ── Aliases ────────────────────────────────────────────
    /** @return Aliases\Aliases|Aliases\Alias */
    public function aliases(?string $name = null): Aliases\Aliases|Aliases\Alias {
        if ($name === null) return $this->aliasesObj;
        return $this->individualAliases[$name] ??= new Aliases\Alias($name, $this->api);
    }

    // ── Keys ───────────────────────────────────────────────
    /** @return Keys\Keys|Keys\Key */
    public function keys(?int $id = null): Keys\Keys|Keys\Key {
        if ($id === null) return $this->keysObj;
        return $this->individualKeys[$id] ??= new Keys\Key($id, $this->api);
    }

    // ── Presets ────────────────────────────────────────────
    /** @return Presets\Presets|Presets\Preset */
    public function presets(?string $name = null): Presets\Presets|Presets\Preset {
        if ($name === null) return $this->presetsObj;
        return $this->individualPresets[$name] ??= new Presets\Preset($name, $this->api);
    }

    // ── Synonyms ───────────────────────────────────────────
    /** @return Synonyms\SynonymSets|Synonyms\SynonymSet */
    public function synonymSets(?string $id = null): Synonyms\SynonymSets|Synonyms\SynonymSet {
        if ($id === null) return $this->synonymSetsObj;
        return $this->individualSynonymSets[$id] ??= new Synonyms\SynonymSet($id, $this->api);
    }

    // ── Curations / Overrides ──────────────────────────────
    /** @return CurationSets\CurationSets|CurationSets\CurationSet */
    public function curationSets(?string $id = null): CurationSets\CurationSets|CurationSets\CurationSet {
        if ($id === null) return $this->curationSetsObj;
        return $this->individualCurationSets[$id] ??= new CurationSets\CurationSet('', $id, $this->api);
    }
    /** @deprecated use curationSets() */
    public function overrides(): Overrides\Overrides { return $this->overridesObj; }

    // ── Analytics ──────────────────────────────────────────
    /** @return Analytics\AnalyticsRules|Analytics\AnalyticsRule */
    public function analyticsRules(?string $name = null): Analytics\AnalyticsRules|Analytics\AnalyticsRule {
        if ($name === null) return $this->analyticsRulesObj;
        return $this->individualAnalyticsRules[$name] ??= new Analytics\AnalyticsRule($name, $this->api);
    }
    public function analyticsEvents(): Analytics\AnalyticsEvents { return $this->analyticsEventsObj; }

    // ── Stopwords ──────────────────────────────────────────
    /** @return Stopwords\Stopwords|Stopwords\Stopword */
    public function stopwords(?string $id = null): Stopwords\Stopwords|Stopwords\Stopword {
        if ($id === null) return $this->stopwordsObj;
        return $this->individualStopwords[$id] ??= new Stopwords\Stopword($id, $this->api);
    }

    // ── Conversations ──────────────────────────────────────
    /** @return Conversations\Conversations|Conversations\Conversation */
    public function conversations(?string $id = null): Conversations\Conversations|Conversations\Conversation {
        if ($id === null) return $this->conversationsObj;
        return $this->individualConversations[$id] ??= new Conversations\Conversation($id, $this->api);
    }

    // ── NL Search Models ───────────────────────────────────
    /** @return NLSearch\NLSearchModels|NLSearch\NLSearchModel */
    public function nlSearchModels(?string $id = null): NLSearch\NLSearchModels|NLSearch\NLSearchModel {
        if ($id === null) return $this->nlSearchModelsObj;
        return $this->individualNLSearchModels[$id] ??= new NLSearch\NLSearchModel($id, $this->api);
    }

    // ── Convenience ─────────────────────────────────────────

    /**
     * Create a client from environment variables.
     *
     *   AACSEARCH_API_KEY   — required
     *   AACSEARCH_BASE_URL  — optional (default: https://api.aacsearch.ru)
     *
     * @throws \RuntimeException when AACSEARCH_API_KEY is not set
     */
    public static function fromEnv(): self {
        $key = getenv('AACSEARCH_API_KEY') ?: '';
        if ($key === '') throw new \RuntimeException('AACSEARCH_API_KEY environment variable is required');
        $url = getenv('AACSEARCH_BASE_URL') ?: null;
        $tenant = getenv('AACSEARCH_TENANT_ID') ?: null;
        return new self($key, $url, $tenant);
    }

    /** Quick connectivity & auth test. Returns true or throws on failure. */
    public function ping(): bool {
        $r = $this->search->health();
        return ($r['ok'] ?? false) === true;
    }
}
