<?php
declare(strict_types=1);
namespace AACSearch\SDK\Collections;
use AACSearch\SDK\ApiCall;
use AACSearch\SDK\Configuration;

/**
 * Documents CRUD. All methods accept a ?locale in $opts:
 *   $docs->retrieve('id', ['locale'=>'ru'])
 *   $docs->create(['title'=>'...'], ['locale'=>'de'])
 */
class Documents extends SearchOnlyDocuments {
    public function __construct(string $c, ApiCall $a, Configuration $cfg) { parent::__construct($c, $a, $cfg); }
    public function create(array $d, array $o = []): array { if(!$d) throw new \InvalidArgumentException('No document'); return $this->api->post($this->endpointPath(), $d, $o); }
    public function upsert(array $d, array $o = []): array { if(!$d) throw new \InvalidArgumentException('No document'); return $this->api->post($this->endpointPath(), $d, array_merge(['action'=>'upsert'], $o)); }
    public function update(array $d, array $o = []): array { if(!$d) throw new \InvalidArgumentException('No document'); return isset($o['filter_by']) ? $this->api->patch($this->endpointPath(), $d, $o) : $this->api->post($this->endpointPath(), $d, array_merge(['action'=>'update'], $o)); }
    public function emplace(array $d, array $o = []): array { if(!$d) throw new \InvalidArgumentException('No document'); return isset($o['filter_by']) ? $this->api->patch($this->endpointPath(), $d, $o) : $this->api->post($this->endpointPath(), $d, array_merge(['action'=>'emplace'], $o)); }
    public function delete(array $q = []): array { return $this->api->delete($this->endpointPath(), $q); }
    public function retrieve(string $id, array $o = []): array { return $this->api->get($this->endpointPath() . '/' . urlencode($id), $o); }
    public function import(array|string $docs, string|array $actionOrOpts = 'upsert'): array|string {
        if (is_string($actionOrOpts)) { $actionOrOpts = ['action' => $actionOrOpts]; }
        $action = $actionOrOpts['action'] ?? 'upsert'; unset($actionOrOpts['action']);
        if (is_string($docs)) return $this->api->post($this->endpointPath() . '/import?action=' . urlencode($action), $docs, $actionOrOpts);
        return $this->api->post($this->endpointPath() . '/import?action=' . urlencode($action), implode("\n", array_map('json_encode', $docs)), $actionOrOpts);
    }
    public function export(array $o = []): string { return $this->api->get($this->endpointPath() . '/export', $o); }
    public function deleteByQuery(array $p): array { return $this->api->delete($this->endpointPath(), $p); }
}
