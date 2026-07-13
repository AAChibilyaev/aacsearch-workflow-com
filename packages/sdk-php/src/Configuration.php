<?php

declare(strict_types=1);

namespace AACSearch\SDK;

class Configuration
{
    private const DEFAULT_CONNECTION_TIMEOUT_SECONDS = 10;
    private const DEFAULT_HEALTHCHECK_INTERVAL_SECONDS = 15;
    private const DEFAULT_NUM_RETRIES = 3;
    private const DEFAULT_RETRY_INTERVAL_SECONDS = 1;

    public readonly string $apiKey;
    /** @var array<int, array{host:string, port:int, protocol:string, path:string}> */
    public readonly array $nodes;
    public readonly int $connectionTimeoutSeconds;
    public readonly int $healthcheckIntervalSeconds;
    public readonly int $numRetries;
    public readonly int $retryIntervalSeconds;
    public readonly bool $sendApiKeyAsQueryParam;
    public readonly int $cacheSearchResultsForSeconds;
    public readonly bool $useServerSideSearchCache;
    public readonly string $logLevel;
    /** @var array<string,string> */
    public readonly array $additionalHeaders;

    private int $currentNodeIndex = 0;

    /**
     * @param array{
     *   apiKey: string,
     *   nodes: array<int, array{host:string, port?:int, protocol?:string, path?:string}>,
     *   nearestNode?: array{host:string, port:int, protocol:string, path?:string},
     *   connectionTimeoutSeconds?: int,
     *   healthcheckIntervalSeconds?: int,
     *   numRetries?: int,
     *   retryIntervalSeconds?: int,
     *   sendApiKeyAsQueryParam?: bool,
     *   cacheSearchResultsForSeconds?: int,
     *   useServerSideSearchCache?: bool,
     *   logLevel?: string,
     *   additionalHeaders?: array<string,string>,
     * } $options
     */
    public function __construct(array $options)
    {
        $this->apiKey = $options['apiKey'];
        if (empty($this->apiKey)) {
            throw new \InvalidArgumentException('AACSearch API key is required');
        }

        $this->nodes = array_map(function (array $node): array {
            return [
                'host' => $node['host'],
                'port' => $node['port'] ?? 443,
                'protocol' => $node['protocol'] ?? 'https',
                'path' => $node['path'] ?? '',
            ];
        }, $options['nodes']);

        if (empty($this->nodes)) {
            throw new \InvalidArgumentException('At least one AACSearch node is required');
        }

        $this->connectionTimeoutSeconds =
            $options['connectionTimeoutSeconds'] ?? self::DEFAULT_CONNECTION_TIMEOUT_SECONDS;
        $this->healthcheckIntervalSeconds =
            $options['healthcheckIntervalSeconds'] ?? self::DEFAULT_HEALTHCHECK_INTERVAL_SECONDS;
        $this->numRetries = $options['numRetries'] ?? self::DEFAULT_NUM_RETRIES;
        $this->retryIntervalSeconds =
            $options['retryIntervalSeconds'] ?? self::DEFAULT_RETRY_INTERVAL_SECONDS;
        $this->sendApiKeyAsQueryParam = $options['sendApiKeyAsQueryParam'] ?? false;
        $this->cacheSearchResultsForSeconds = $options['cacheSearchResultsForSeconds'] ?? 0;
        $this->useServerSideSearchCache = $options['useServerSideSearchCache'] ?? false;
        $this->logLevel = $options['logLevel'] ?? 'warn';
        $this->additionalHeaders = $options['additionalHeaders'] ?? [];
    }

    /** @return array{host:string, port:int, protocol:string, path:string} */
    public function currentNode(): array
    {
        return $this->nodes[$this->currentNodeIndex];
    }

    /** @return array{host:string, port:int, protocol:string, path:string} */
    public function nextNode(): array
    {
        $this->currentNodeIndex = ($this->currentNodeIndex + 1) % count($this->nodes);
        return $this->currentNode();
    }

    /** @param array{host:string, port:int, protocol:string, path?:string}|null $node */
    public function baseUrl(?array $node = null): string
    {
        $n = $node ?? $this->currentNode();
        $path = $n['path'] ?? '';
        return "{$n['protocol']}://{$n['host']}:{$n['port']}{$path}";
    }
}
