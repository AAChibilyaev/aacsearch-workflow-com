<?php
declare(strict_types=1);
namespace AACSearch\SDK\CurationSets;
use AACSearch\SDK\ApiCall;
class CurationSetItem { public function __construct(private readonly string $c,private readonly string $sid,private readonly string $iid,private readonly ApiCall $a){} public function retrieve():array{return $this->a->get('/curations/'.urlencode($this->c).'/curations/'.urlencode($this->sid).'/items/'.urlencode($this->iid));} public function delete():array{return $this->a->delete('/curations/'.urlencode($this->c).'/curations/'.urlencode($this->sid).'/items/'.urlencode($this->iid));} }
