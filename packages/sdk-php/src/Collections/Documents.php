<?php

declare(strict_types=1);

namespace AACSearch\SDK\Collections;

use AACSearch\SDK\ApiCall;
use AACSearch\SDK\Configuration;

class Documents extends SearchOnlyDocuments
{
    public function __construct(
        string $collectionName,
        ApiCall $apiCall,
        Configuration $configuration,
    ) {
        parent::__construct($collectionName, $apiCall, $configuration);
    }

    /**
     * @param array<string,mixed> $document
     * @return array<string,mixed>
     */
    public function create(array $document, array $options = []): array
    {
        if (empty($document)) {
            throw new \InvalidArgumentException('No document provided');
        }
        return $this->apiCall->post($this->endpointPath(), $document, $options);
    }

    /**
     * @param array<string,mixed> $document
     * @return array<string,mixed>
     */
    public function upsert(array $document, array $options = []): array
    {
        if (empty($document)) {
            throw new \InvalidArgumentException('No document provided');
        }
        return $this->apiCall->post($this->endpointPath(), $document, array_merge($options, ['action' => 'upsert']));
    }

    /**
     * @param array<string,mixed> $document
     * @return array<string,mixed>
     */
    public function update(array $document, array $options = []): array
    {
        if (empty($document)) {
            throw new \InvalidArgumentException('No document provided');
        }
        if (isset($options['filter_by'])) {
            return $this->apiCall->patch($this->endpointPath(), $document, $options);
        }
        return $this->apiCall->post($this->endpointPath(), $document, array_merge($options, ['action' => 'update']));
    }

    /**
     * @param array<string,mixed> $document
     * @return array<string,mixed>
     */
    public function emplace(array $document, array $options = []): array
    {
        if (empty($document)) {
            throw new \InvalidArgumentException('No document provided');
        }
        if (isset($options['filter_by'])) {
            return $this->apiCall->patch($this->endpointPath(), $document, $options);
        }
        return $this->apiCall->post($this->endpointPath(), $document, array_merge($options, ['action' => 'emplace']));
    }

    /** @return array{num_deleted: int, results?: array<int, array{id:string}>} */
    public function delete(array $query = []): array
    {
        return $this->apiCall->delete($this->endpointPath(), $query);
    }

    /** @return array<string,mixed> */
    public function retrieve(string $id): array
    {
        return $this->apiCall->get($this->endpointPath() . '/' . urlencode($id));
    }

    /**
     * @param array<int,array<string,mixed>>|string $documents
     * @return array<int,array<string,mixed>>|string
     */
    public function import(array|string $documents, array $options = []): array|string
    {
        $action = $options['action'] ?? 'upsert';
        unset($options['action']);

        if (is_string($documents)) {
            return $this->apiCall->post(
                $this->endpointPath() . '/import?action=' . urlencode($action),
                $documents,
                $options,
            );
        }

        $ndjson = implode("\n", array_map('json_encode', $documents));
        return $this->apiCall->post(
            $this->endpointPath() . '/import?action=' . urlencode($action),
            $ndjson,
            $options,
        );
    }

    /** @return string */
    public function export(array $options = []): string
    {
        return $this->apiCall->get($this->endpointPath() . '/export', $options);
    }

    /** @return array{num_deleted: int} */
    public function deleteByQuery(array $params): array
    {
        return $this->apiCall->delete($this->endpointPath(), $params);
    }
}
