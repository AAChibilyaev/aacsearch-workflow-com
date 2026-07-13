<?php
declare(strict_types=1);
namespace AACSearch\SDK\NLSearch;
use AACSearch\SDK\ApiCall;
class NLSearchModel { public function __construct(private readonly string $id,private readonly ApiCall $a){} public function retrieve():array{return $this->a->get('/nl_search/models/'.urlencode($this->id));} public function update(array $p):array{return $this->a->put('/nl_search/models/'.urlencode($this->id),$p);} public function delete():array{return $this->a->delete('/nl_search/models/'.urlencode($this->id));} }
