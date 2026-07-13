<?php
declare(strict_types=1);
namespace AACSearch\SDK;
use AACSearch\SDK\Collections\SearchOnlyCollection;
class SearchClient {
    public readonly MultiSearch $multiSearch;
    private readonly Configuration $config;
    private readonly ApiCall $api;
    private array $colls = [];
    public function __construct(string|array $options, ?string $baseUrl = null) {
        $this->config = new Configuration($options, $baseUrl);
        $this->api = new ApiCall($this->config);
        $this->multiSearch = new MultiSearch($this->api);
    }
    public function clearCache(): void { foreach ($this->colls as $c) $c->documents()->clearCache(); }
    public function collections(string $name): SearchOnlyCollection {
        if ($name === '') throw new \InvalidArgumentException('collectionName is required');
        if (!isset($this->colls[$name])) $this->colls[$name] = new SearchOnlyCollection($name, $this->api, $this->config);
        return $this->colls[$name];
    }
}
