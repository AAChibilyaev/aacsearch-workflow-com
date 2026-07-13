<?php
declare(strict_types=1);
namespace AACSearch\SDK\NLSearch;
use AACSearch\SDK\ApiCall;
class NLSearchModels { public function __construct(private readonly ApiCall $a){} public function create(array $s):array{return $this->a->post('/nl_search/models',$s);} public function retrieve():array{return $this->a->get('/nl_search/models');} }
