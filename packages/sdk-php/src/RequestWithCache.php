<?php

declare(strict_types=1);

namespace AACSearch\SDK;

class RequestWithCache
{
    /** @var array<string, array{timestamp:float, response:mixed}> */
    private array $responseCache = [];
    /** @var array<string, array{timestamp:float, promise:mixed}> */
    private array $promiseCache = [];

    public function clearCache(): void
    {
        $this->responseCache = [];
        $this->promiseCache = [];
    }

    /**
     * @param array{path:string, queryParams?:array<string,mixed>, body?:mixed} $params
     * @param array{cacheResponseForSeconds?:int} $cacheOptions
     * @return mixed
     */
    public function perform(
        ApiCall $apiCall,
        string $methodName,
        array $params,
        array $cacheOptions = [],
    ): mixed {
        $cacheResponseForSeconds = $cacheOptions['cacheResponseForSeconds'] ?? 60;
        if ($cacheResponseForSeconds <= 0) {
            return $apiCall->{$methodName}($params['path'], $params['queryParams'] ?? [], $params['body'] ?? null);
        }

        $key = json_encode(['method' => $methodName, ...$params]);
        $now = microtime(true);

        if (isset($this->responseCache[$key]) && ($now - $this->responseCache[$key]['timestamp']) < $cacheResponseForSeconds) {
            return $this->responseCache[$key]['response'];
        }

        $response = $apiCall->{$methodName}($params['path'], $params['queryParams'] ?? [], $params['body'] ?? null);
        $this->responseCache[$key] = ['timestamp' => $now, 'response' => $response];

        return $response;
    }
}
