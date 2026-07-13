<?php
declare(strict_types=1);
namespace AACSearch\SDK\Errors;
class ServerError extends HTTPError { public function __construct(string $m='Server error') { parent::__construct($m,500,'server_error'); } }
