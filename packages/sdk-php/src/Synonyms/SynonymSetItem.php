<?php
declare(strict_types=1);
namespace AACSearch\SDK\Synonyms;
use AACSearch\SDK\ApiCall;
class SynonymSetItem { public function __construct(private readonly string $sid,private readonly string $iid,private readonly ApiCall $a){} public function retrieve():array{return $this->a->get('/synonyms/'.urlencode($this->sid).'/items/'.urlencode($this->iid));} public function delete():array{return $this->a->delete('/synonyms/'.urlencode($this->sid).'/items/'.urlencode($this->iid));} }
