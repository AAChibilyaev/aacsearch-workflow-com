<?php
declare(strict_types=1);
namespace AACSearch\SDK\Synonyms;
use AACSearch\SDK\ApiCall;

class Synonyms {
    private const RESOURCEPATH = '/synonyms';
    public function __construct(private readonly ApiCall $apiCall) {}
    /** @param array{synonyms: string[], root?: string} $schema */
    public function create(array $schema): array { return $this->apiCall->post(self::RESOURCEPATH, $schema); }
    /** @return array{synonyms: array<int, array<string,mixed>>} */
    public function retrieve(): array { return $this->apiCall->get(self::RESOURCEPATH); }
}
