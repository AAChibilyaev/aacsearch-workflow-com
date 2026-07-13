<?php
declare(strict_types=1);
namespace AACSearch\SDK\Conversations;
use AACSearch\SDK\ApiCall;
class ConversationModel { public function __construct(private readonly string $id,private readonly ApiCall $a){} public function retrieve():array{return $this->a->get('/conversations/models/'.urlencode($this->id));} public function update(array $p):array{return $this->a->put('/conversations/models/'.urlencode($this->id),$p);} public function delete():array{return $this->a->delete('/conversations/models/'.urlencode($this->id));} }
