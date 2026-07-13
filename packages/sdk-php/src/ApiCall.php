<?php

declare(strict_types=1);

namespace AACSearch\SDK;

use AACSearch\SDK\Errors\HTTPError;
use AACSearch\SDK\Errors\ObjectNotFound;
use AACSearch\SDK\Errors\ObjectAlreadyExists;
use AACSearch\SDK\Errors\ObjectUnprocessable;
use AACSearch\SDK\Errors\RequestMalformed;
use AACSearch\SDK\Errors\RequestUnauthorized;
use AACSearch\SDK\Errors\ServerError;
use GuzzleHttp\Client as GuzzleClient;
use GuzzleHttp\Exception\GuzzleException;

class ApiCall
{
    private Configuration $config;
    private GuzzleClient $http;

    public function __construct(Configuration $config)
    {
        $this->config = $config;
        $this->http = new GuzzleClient(['http_errors' => false]);
    }

    /** @param array<string,mixed> $query */
    public function get(string $path, array $query = []): mixed
    {
        return $this->proxy('GET', $path, $query);
    }

    /** @param array<string,mixed> $query */
    public function post(string $path, mixed $body = null, array $query = []): mixed
    {
        return $this->proxy('POST', $path, $query, $body);
    }

    /** @param array<string,mixed> $query */
    public function put(string $path, mixed $body = null, array $query = []): mixed
    {
        return $this->proxy('PUT', $path, $query, $body);
    }

    /** @param array<string,mixed> $query */
    public function patch(string $path, mixed $body = null, array $query = []): mixed
    {
        return $this->proxy('PATCH', $path, $query, $body);
    }

    /** @param array<string,mixed> $query */
    public function delete(string $path, array $query = []): mixed
    {
        return $this->proxy('DELETE', $path, $query);
    }

    /**
     * Route requests: PayloadCMS-native paths go direct; AACSearch Engine paths via /v1/proxy.
     */
    private function proxy(string $method, string $path, array $query = [], mixed $body = null): mixed
    {
        // PayloadCMS-native paths — direct request
        $isPayloadCMS = str_starts_with($path, '/integrations/')
            || str_starts_with($path, '/billing/')
            || str_starts_with($path, '/v1/')
            || str_starts_with($path, '/api/');

        if ($isPayloadCMS) {
            return $this->directRequest($method, $path, $query, $body);
        }

        // AACSearch Engine paths — through /v1/proxy.
        // Tenant is auto-detected server-side from the API key.
        return $this->directRequest('POST', '/v1/proxy', [], [
            'method' => $method,
            'path' => $path,
            'body' => $body,
        ]);
    }

    /** @param array<string,mixed> $query */
    private function directRequest(string $method, string $path, array $query = [], mixed $body = null): mixed
    {
        $url = $this->config->url($path);
        $options = [
            'headers' => [
                'Authorization' => 'Bearer ' . $this->config->apiKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ],
            'timeout' => $this->config->timeoutSeconds,
        ];

        if ($query !== []) {
            $options['query'] = $query;
        }
        if ($body !== null) {
            $options['json'] = $body;
        }

        $lastError = null;
        $maxAttempts = $this->config->numRetries + 1;

        for ($attempt = 0; $attempt < $maxAttempts; $attempt++) {
            try {
                $response = $this->http->request($method, $url, $options);
                $status = $response->getStatusCode();
                $data = json_decode((string) $response->getBody(), true);

                if ($status >= 200 && $status < 300) {
                    return $data;
                }

                $error = $this->toError($method, $url, $status, $data);

                if ($error instanceof ServerError && $attempt < $maxAttempts - 1) {
                    $lastError = $error;
                    usleep(($attempt + 1) * 500000);
                    continue;
                }

                throw $error;
            } catch (HTTPError $e) {
                throw $e;
            } catch (GuzzleException $e) {
                $lastError = new ServerError($e->getMessage());
                if ($attempt < $maxAttempts - 1) {
                    usleep(($attempt + 1) * 500000);
                    continue;
                }
                throw $lastError;
            }
        }

        throw $lastError ?? new ServerError('Unknown error');
    }

    /** @param mixed $data */
    private function toError(string $method, string $url, int $status, mixed $data): HTTPError
    {
        $detail = (is_array($data) && isset($data['error']))
            ? (is_string($data['error']) ? $data['error'] : json_encode($data['error']))
            : '';
        $msg = "{$method} {$url}: {$status}" . ($detail ? " — {$detail}" : '');

        return match ($status) {
            400 => new RequestMalformed($msg),
            401 => new RequestUnauthorized($msg),
            404 => new ObjectNotFound($msg),
            409 => new ObjectAlreadyExists($msg),
            422 => new ObjectUnprocessable($msg),
            500, 502, 503, 504 => new ServerError($msg),
            default => new HTTPError($msg, $status),
        };
    }
}
