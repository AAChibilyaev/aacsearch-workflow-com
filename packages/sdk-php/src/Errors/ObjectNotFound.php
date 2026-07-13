<?php
declare(strict_types=1);
namespace AACSearch\SDK\Errors;
class ObjectNotFound extends HTTPError { public function __construct(string $m='Not found') { parent::__construct($m,404,'not_found'); } }
