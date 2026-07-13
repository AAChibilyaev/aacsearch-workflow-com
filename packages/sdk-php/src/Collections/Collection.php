<?php

declare(strict_types=1);

namespace AACSearch\SDK\Collections;

use AACSearch\SDK\ApiCall;
use AACSearch\SDK\Configuration;

class Collection
{
    public readonly Documents $documents;

    public function __construct(
        private readonly string $name,
        private readonly ApiCall $apiCall,
        Configuration $configuration,
    ) {
        $this->documents = new Documents($name, $apiCall, $configuration);
    }

    /** @return array<string,mixed> */
    public function retrieve(): array
    {
        return $this->apiCall->get('/collections/' . urlencode($this->name));
    }

    /**
     * @param array{fields: array<int,array<string,mixed>>} $schema
     * @return array<string,mixed>
     */
    public function update(array $schema): array
    {
        return $this->apiCall->patch('/collections/' . urlencode($this->name), $schema);
    }

    /**
     * @param array{fields: string[]} $fields
     * @return array<string,mixed>
     */
    public function dropField(array $fields): array
    {
        return $this->apiCall->patch('/collections/' . urlencode($this->name), $fields);
    }

    /** @return array<string,mixed> */
    public function delete(): array
    {
        return $this->apiCall->delete('/collections/' . urlencode($this->name));
    }

    /**
     * @param array<string,mixed> $params
     * @return array{found:int, hits:array<int,array<string,mixed>>, facet_counts:array<int,array<string,mixed>>}
     */
    public function search(array $params): array
    {
        return $this->apiCall->get(
            '/collections/' . urlencode($this->name) . '/documents/search',
            $params,
        );
    }
}
