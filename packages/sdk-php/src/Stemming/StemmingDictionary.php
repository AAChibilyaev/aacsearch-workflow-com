<?php
declare(strict_types=1);
namespace AACSearch\SDK\Stemming;
use AACSearch\SDK\ApiCall;

class StemmingDictionary {
    public function __construct(private readonly string $id, private readonly ApiCall $apiCall) {}
    /** @return array<string,mixed> */
    public function retrieve(): array { return $this->apiCall->get(Stemming::RESOURCEPATH . '/dictionaries/' . urlencode($this->id)); }
    /** @return array{id: string} */
    public function delete(): array { return $this->apiCall->delete(Stemming::RESOURCEPATH . '/dictionaries/' . urlencode($this->id)); }
}
