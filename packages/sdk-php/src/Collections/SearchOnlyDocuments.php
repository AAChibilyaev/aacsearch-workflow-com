<?php
declare(strict_types=1);
namespace AACSearch\SDK\Collections;
use AACSearch\SDK\ApiCall;
use AACSearch\SDK\Configuration;
use AACSearch\SDK\SearchParams;
class SearchOnlyDocuments {
    public function __construct(protected readonly string $coll, protected readonly ApiCall $api, Configuration $cfg) {}
    /** Search with tenant filter injection. Accepts array or SearchParams. */
    public function search(array|SearchParams $p): array {
        $entry = array_merge(['collection' => $this->coll], $p instanceof SearchParams ? $p->toArray() : $p);
        $res = $this->api->post('/v1/multi_search', ['searches' => [$entry]]);
        return $res['results'][0] ?? ['found' => 0, 'hits' => []];
    }
    protected function endpointPath(): string { return '/collections/' . urlencode($this->coll) . '/documents'; }
}
