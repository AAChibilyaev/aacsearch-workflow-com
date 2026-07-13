<?php

declare(strict_types=1);

namespace AACSearch\SDK\Collections;

use AACSearch\SDK\ApiCall;
use AACSearch\SDK\Configuration;

class SearchOnlyCollection
{
    private readonly SearchOnlyDocuments $docs;

    public function __construct(
        private readonly string $name,
        private readonly ApiCall $apiCall,
        Configuration $configuration,
    ) {
        $this->docs = new SearchOnlyDocuments($name, $apiCall, $configuration);
    }

    public function documents(): SearchOnlyDocuments
    {
        return $this->docs;
    }

    /** @return array<string,mixed> */
    public function retrieve(): array
    {
        return $this->apiCall->get('/collections/' . urlencode($this->name));
    }
}
