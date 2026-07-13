<?php
declare(strict_types=1);
namespace AACSearch\SDK\System;
use AACSearch\SDK\ApiCall;
class Operations { public function __construct(private readonly ApiCall $a){} public function perform(string $action='snapshot'):array{return $this->a->post('/operations/'.$action);} }
