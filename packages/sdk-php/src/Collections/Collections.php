<?php

declare(strict_types=1);

namespace AACSearch\SDK\Collections;

use AACSearch\SDK\ApiCall;

class Collections
{
    private const RESOURCEPATH = '/collections';

    public function __construct(private readonly ApiCall $apiCall) {}

    /**
     * @param array{name:string, fields:array<int,array<string,mixed>>, default_sorting_field?:string} $schema
     * @return array<string,mixed>
     */
    public function create(array $schema, array $options = []): array
    {
        return $this->apiCall->post(self::RESOURCEPATH, $schema, $options);
    }

    /** @return array<int, array<string,mixed>> */
    public function retrieve(array $options = []): array
    {
        return $this->apiCall->get(self::RESOURCEPATH, $options);
    }

    /** @return array<string,mixed> */
    public function retrieveOne(string $name): array
    {
        return $this->apiCall->get(self::RESOURCEPATH . '/' . urlencode($name));
    }

    /**
     * @param array{fields: array<int,array<string,mixed>>} $schema
     * @return array<string,mixed>
     */
    public function update(string $name, array $schema): array
    {
        return $this->apiCall->patch(self::RESOURCEPATH . '/' . urlencode($name), $schema);
    }

    /** @return array<string,mixed> */
    public function delete(string $name): array
    {
        return $this->apiCall->delete(self::RESOURCEPATH . '/' . urlencode($name));
    }
}
