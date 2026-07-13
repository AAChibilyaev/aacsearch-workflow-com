<?php
declare(strict_types=1);
namespace AACSearch\SDK\Errors;
class RequestMalformed extends HTTPError { public function __construct(string $m='Bad request') { parent::__construct($m,400,'malformed'); } }
