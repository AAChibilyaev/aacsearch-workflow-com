<?php
declare(strict_types=1);
namespace AACSearch\SDK\Errors;
class MissingConfigurationError extends AACSearchError { public function __construct(string $m='Missing config') { parent::__construct($m); } }
