<?php
declare(strict_types=1);
namespace AACSearch\SDK\Collections;
use AACSearch\SDK\ApiCall;
use AACSearch\SDK\Configuration;

class Documents extends SearchOnlyDocuments {
    public function __construct(string $c, ApiCall $a, Configuration $cfg) { parent::__construct($c, $a, $cfg); }

    /** Create a document. Returns the created document. */
    public function create(array $d, array $o = []): array { if(!$d) throw new \InvalidArgumentException('No document'); return $this->api->post($this->endpointPath(), $d, $o); }

    /** Create or update a document by ID. */
    public function upsert(array $d, array $o = []): array { if(!$d) throw new \InvalidArgumentException('No document'); return $this->api->post($this->endpointPath(), $d, array_merge($o, ['action'=>'upsert'])); }

    /** Update a document. Uses filter_by for bulk updates, otherwise updates by ID. */
    public function update(array $d, array $o = []): array { if(!$d) throw new \InvalidArgumentException('No document'); return isset($o['filter_by']) ? $this->api->patch($this->endpointPath(), $d, $o) : $this->api->post($this->endpointPath(), $d, array_merge($o, ['action'=>'update'])); }

    /** Create or update a document by filter (emplace). */
    public function emplace(array $d, array $o = []): array { if(!$d) throw new \InvalidArgumentException('No document'); return isset($o['filter_by']) ? $this->api->patch($this->endpointPath(), $d, $o) : $this->api->post($this->endpointPath(), $d, array_merge($o, ['action'=>'emplace'])); }

    /** Delete documents by filter. Returns {num_deleted, results?}. */
    public function delete(array $q = []): array { return $this->api->delete($this->endpointPath(), $q); }

    /** Retrieve a single document by ID. */
    public function retrieve(string $id): array { return $this->api->get($this->endpointPath() . '/' . urlencode($id)); }

    /**
     * Bulk import documents as JSONL.
     * @param array<int,array>|string $docs  Array of documents or raw JSONL string
     * @param string|array $actionOrOpts     Action: 'upsert' (default), 'create', 'update', 'emplace' — or options array
     * @return array|string  Import errors array, or raw string response
     */
    public function import(array|string $docs, string|array $actionOrOpts = 'upsert'): array|string {
        if (is_string($actionOrOpts)) {
            $actionOrOpts = ['action' => $actionOrOpts];
        }
        $action = $actionOrOpts['action'] ?? 'upsert';
        unset($actionOrOpts['action']);

        if (is_string($docs)) {
            return $this->api->post($this->endpointPath() . '/import?action=' . urlencode($action), $docs, $actionOrOpts);
        }
        return $this->api->post($this->endpointPath() . '/import?action=' . urlencode($action), implode("\n", array_map('json_encode', $docs)), $actionOrOpts);
    }

    /** Export all documents as JSONL string. */
    public function export(array $o = []): string { return $this->api->get($this->endpointPath() . '/export', $o); }

    /** Delete documents matching a filter_by query. */
    public function deleteByQuery(array $p): array { return $this->api->delete($this->endpointPath(), $p); }
}
