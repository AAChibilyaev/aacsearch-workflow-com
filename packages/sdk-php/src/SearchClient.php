<?php

declare(strict_types=1);

namespace AACSearch\SDK;

use AACSearch\SDK\Collections\SearchOnlyCollection;

class SearchClient
{
    public readonly MultiSearch $multiSearch;
    private readonly Configuration $configuration;
    private readonly ApiCall $apiCall;
    /** @var array<string, SearchOnlyCollection> */
    private array $individualCollections = [];

    /**
     * @param array{
     *   apiKey: string,
     *   nodes: array<int, array{host:string, port?:int, protocol?:string, path?:string}>,
     *   connectionTimeoutSeconds?: int,
     *   numRetries?: int,
     *   retryIntervalSeconds?: int,
     *   cacheSearchResultsForSeconds?: int,
     *   additionalHeaders?: array<string,string>,
     * } $options
     */
    public function __construct(array $options)
    {
        $options['sendApiKeyAsQueryParam'] = $options['sendApiKeyAsQueryParam'] ?? true;
        $this->configuration = new Configuration($options);
        $this->apiCall = new ApiCall($this->configuration);
        $this->multiSearch = new MultiSearch($this->apiCall, $this->configuration);
    }

    public function clearCache(): void
    {
        $this->multiSearch->clearCache();
        foreach ($this->individualCollections as $collection) {
            $collection->documents()->clearCache();
        }
    }

    public function collections(string $collectionName): SearchOnlyCollection
    {
        if (empty($collectionName)) {
            throw new \InvalidArgumentException(
                'AACSearch.SearchClient only supports search operations, so the collectionName that needs to be searched must be specified. Use AACSearch.Client if you need to access the full collection object.'
            );
        }
        if (!isset($this->individualCollections[$collectionName])) {
            $this->individualCollections[$collectionName] = new SearchOnlyCollection($collectionName, $this->apiCall, $this->configuration);
        }
        return $this->individualCollections[$collectionName];
    }
}
