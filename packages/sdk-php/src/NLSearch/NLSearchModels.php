<?php
declare(strict_types=1);
namespace AACSearch\SDK\NLSearch;
use AACSearch\SDK\ApiCall;

class NLSearchModels {
    private const RESOURCEPATH = '/nl_search/models';
    public function __construct(private readonly ApiCall $apiCall) {}
    /** @param array{model_name:string, api_key:string} $schema */
    public function create(array $schema): array { return $this->apiCall->post(self::RESOURCEPATH, $schema); }
    /** @return array{models: array<int, array<string,mixed>>} */
    public function retrieve(): array { return $this->apiCall->get(self::RESOURCEPATH); }
}
