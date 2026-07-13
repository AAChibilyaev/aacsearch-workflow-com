<?php
declare(strict_types=1);
namespace AACSearch\SDK\Conversations;
use AACSearch\SDK\ApiCall;

class Conversations {
    private const RESOURCEPATH = '/conversations';
    public readonly ConversationModels $models;
    /** @var array<string, Conversation> */
    private array $individualModels = [];
    public function __construct(private readonly ApiCall $apiCall) {
        $this->models = new ConversationModels($apiCall);
    }
    /** @return array{conversations: array<int, array<string,mixed>>} */
    public function retrieve(): array { return $this->apiCall->get(self::RESOURCEPATH); }
    public function models(?string $id = null): ConversationModels|Conversation {
        if ($id === null) return $this->models;
        if (!isset($this->individualModels[$id])) {
            $this->individualModels[$id] = new Conversation($id, $this->apiCall);
        }
        return $this->individualModels[$id];
    }
}
