<?php
declare(strict_types=1);
namespace AACSearch\SDK\Collections;
use AACSearch\SDK\ApiCall;
use AACSearch\SDK\Configuration;
use AACSearch\SDK\SearchParams;
class Collection {
    public readonly Documents $documents;
    public function __construct(private readonly string $name, private readonly ApiCall $api, Configuration $cfg) {
        $this->documents = new Documents($name, $api, $cfg);
    }
    public function retrieve(): array { return $this->api->get('/collections/' . urlencode($this->name)); }
    public function update(array $s): array { return $this->api->patch('/collections/' . urlencode($this->name), $s); }
    public function delete(): array { return $this->api->delete('/collections/' . urlencode($this->name)); }
    /** Search with tenant filter injection. Accepts array or SearchParams. */
    public function search(array|SearchParams $p): array {
        $entry = array_merge(['collection' => $this->name], $p instanceof SearchParams ? $p->toArray() : $p);
        $res = $this->api->post('/v1/multi_search', ['searches' => [$entry]]);
        return $res['results'][0] ?? ['found' => 0, 'hits' => []];
    }
}
