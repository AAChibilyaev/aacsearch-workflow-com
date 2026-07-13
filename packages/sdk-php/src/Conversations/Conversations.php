<?php
declare(strict_types=1);
namespace AACSearch\SDK\Conversations;
use AACSearch\SDK\ApiCall;
class Conversations { public readonly ConversationModels $models; private array $im=[]; public function __construct(private readonly ApiCall $a){$this->models=new ConversationModels($a);} public function retrieve():array{return $this->a->get('/conversations');} public function models(?string $id=null):ConversationModels|Conversation{if($id===null)return $this->models;if(!isset($this->im[$id]))$this->im[$id]=new Conversation($id,$this->a);return $this->im[$id];} }
