<?php
declare(strict_types=1);
namespace AACSearch\SDK\Conversations;
use AACSearch\SDK\ApiCall;
class ConversationModels { public function __construct(private readonly ApiCall $a){} public function create(array $s):array{return $this->a->post('/conversations/models',$s);} public function retrieve():array{return $this->a->get('/conversations/models');} }
