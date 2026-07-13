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
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\GuzzleException;
use GuzzleHttp\Exception\RequestException;

class ApiCall
{
    private Configuration $configuration;
    /** @var array<string, GuzzleClient> */
    private array $clients = [];

    public function __construct(Configuration $configuration)
    {
        $this->configuration = $configuration;
    }

    /**
     * @param array<string,mixed> $params
     * @return mixed
     * @throws HTTPError
     */
    public function get(string $endpoint, array $params = []): mixed
    {
        return $this->request('GET', $endpoint, ['query' => $params]);
    }

    /**
     * @param mixed $body
     * @param array<string,mixed> $params
     * @return mixed
     * @throws HTTPError
     */
    public function post(string $endpoint, mixed $body = null, array $params = []): mixed
    {
        return $this->request('POST', $endpoint, ['query' => $params, 'json' => $body]);
    }

    /**
     * @param mixed $body
     * @param array<string,mixed> $params
     * @return mixed
     * @throws HTTPError
     */
    public function put(string $endpoint, mixed $body = null, array $params = []): mixed
    {
        return $this->request('PUT', $endpoint, ['query' => $params, 'json' => $body]);
    }

    /**
     * @param mixed $body
     * @param array<string,mixed> $params
     * @return mixed
     * @throws HTTPError
     */
    public function patch(string $endpoint, mixed $body = null, array $params = []): mixed
    {
        return $this->request('PATCH', $endpoint, ['query' => $params, 'json' => $body]);
    }

    /**
     * @param array<string,mixed> $params
     * @return mixed
     * @throws HTTPError
     */
    public function delete(string $endpoint, array $params = []): mixed
    {
        return $this->request('DELETE', $endpoint, ['query' => $params]);
    }

    /**
     * @param array<string,mixed> $options
     * @return mixed
     * @throws HTTPError
     */
    private function request(string $method, string $endpoint, array $options = []): mixed
    {
        $numRetries = $this->configuration->numRetries;
        $lastError = null;

        for ($attempt = 0; $attempt <= $numRetries; $attempt++) {
            $node = $attempt === 0
                ? $this->configuration->currentNode()
                : $this->configuration->nextNode();

            try {
                return $this->performRequest($method, $endpoint, $node, $options);
            } catch (HTTPError $e) {
                $lastError = $e;
                if ($e instanceof ServerError || $e->httpStatus === null || $e->httpStatus >= 500) {
                    if ($attempt < $numRetries) {
                        usleep(($attempt + 1) * 1000000);
                        continue;
                    }
                }
                throw $e;
            } catch (GuzzleException $e) {
                $lastError = $e;
                if ($attempt < $numRetries) {
                    usleep(($attempt + 1) * 1000000);
                    continue;
                }
                throw new ServerError($e->getMessage());
            }
        }

        throw $lastError instanceof HTTPError
            ? $lastError
            : new ServerError($lastError ? $lastError->getMessage() : 'Unknown error');
    }

    /**
     * @param array{host:string, port:int, protocol:string, path?:string} $node
     * @param array<string,mixed> $options
     * @return mixed
     * @throws HTTPError
     * @throws GuzzleException
     */
    private function performRequest(string $method, string $endpoint, array $node, array $options): mixed
    {
        $path = $node['path'] ?? '';
        $url = "{$node['protocol']}://{$node['host']}:{$node['port']}{$path}{$endpoint}";

        $headers = array_merge(
            [
                'Authorization' => 'Bearer ' . $this->configuration->apiKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ],
            $this->configuration->additionalHeaders,
        );

        $requestOptions = array_merge($options, [
            'headers' => $headers,
            'timeout' => $this->configuration->connectionTimeoutSeconds,
            'http_errors' => false,
        ]);

        $client = $this->getClient($node);
        $response = $client->request($method, $url, $requestOptions);

        $status = $response->getStatusCode();
        $body = json_decode((string) $response->getBody(), true);

        if ($status >= 200 && $status < 300) {
            return $body;
        }

        throw $this->customError($status, $body);
    }

    /**
     * @param array{host:string, port:int} $node
     */
    private function getClient(array $node): GuzzleClient
    {
        $key = "{$node['host']}:{$node['port']}";
        if (!isset($this->clients[$key])) {
            $this->clients[$key] = new GuzzleClient();
        }
        return $this->clients[$key];
    }

    /**
     * @param mixed $data
     */
    private function customError(int $status, mixed $data): HTTPError
    {
        $message = (is_array($data) && isset($data['message']))
            ? $data['message']
            : "HTTP error {$status}";

        return match ($status) {
            400 => new RequestMalformed($message),
            401 => new RequestUnauthorized($message),
            404 => new ObjectNotFound($message),
            409 => new ObjectAlreadyExists($message),
            422 => new ObjectUnprocessable($message),
            500, 502, 503, 504 => new ServerError($message),
            default => new HTTPError($message, $status),
        };
    }
}
