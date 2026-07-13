<?php
declare(strict_types=1);
namespace AACSearch\SDK\Errors;
class ObjectUnprocessable extends HTTPError { public function __construct(string $m='Unprocessable') { parent::__construct($m,422,'unprocessable'); } }
