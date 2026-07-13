<?php
declare(strict_types=1);
namespace AACSearch\SDK\Stemming;
use AACSearch\SDK\ApiCall;

class Stemming {
    public const RESOURCEPATH = '/stemming';
    public readonly StemmingDictionaries $dictionaries;
    /** @var array<string, StemmingDictionary> */
    private array $individualDictionaries = [];
    public function __construct(private readonly ApiCall $apiCall) {
        $this->dictionaries = new StemmingDictionaries($apiCall);
    }
    /** @return array{dictionaries: string[]} */
    public function retrieve(): array { return $this->apiCall->get(self::RESOURCEPATH); }
    public function dictionaries(?string $id = null): StemmingDictionaries|StemmingDictionary {
        if ($id === null) return $this->dictionaries;
        if (!isset($this->individualDictionaries[$id])) {
            $this->individualDictionaries[$id] = new StemmingDictionary($id, $this->apiCall);
        }
        return $this->individualDictionaries[$id];
    }
}
