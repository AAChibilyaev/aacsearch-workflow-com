<?php
declare(strict_types=1);
namespace AACSearch\SDK\Collections;
use AACSearch\SDK\ApiCall;
use AACSearch\SDK\Configuration;
class SearchOnlyCollection {
    private readonly SearchOnlyDocuments $docs;
    public function __construct(private readonly string $name, private readonly ApiCall $api, Configuration $cfg) {
        $this->docs = new SearchOnlyDocuments($name, $api, $cfg);
    }
    public function documents(): SearchOnlyDocuments { return $this->docs; }
    public function retrieve(): array { return $this->api->get('/collections/' . urlencode($this->name)); }
}
