<?php
declare(strict_types=1);
namespace AACSearch\SDK\Errors;
class ObjectAlreadyExists extends HTTPError { public function __construct(string $m='Already exists') { parent::__construct($m,409,'already_exists'); } }
