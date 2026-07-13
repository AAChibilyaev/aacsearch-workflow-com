<?php
declare(strict_types=1);
namespace AACSearch\SDK\NLSearch;
use AACSearch\SDK\ApiCall;

class NLSearchModel {
    private const RESOURCEPATH = '/nl_search/models';
    public function __construct(private readonly string $id, private readonly ApiCall $apiCall) {}
    /** @return array<string,mixed> */
    public function retrieve(): array { return $this->apiCall->get(self::RESOURCEPATH . '/' . urlencode($this->id)); }
    /** @param array{model_name?:string, api_key?:string} $params */
    public function update(array $params): array { return $this->apiCall->put(self::RESOURCEPATH . '/' . urlencode($this->id), $params); }
    /** @return array{id: string} */
    public function delete(): array { return $this->apiCall->delete(self::RESOURCEPATH . '/' . urlencode($this->id)); }
}
