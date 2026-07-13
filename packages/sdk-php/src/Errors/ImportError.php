<?php
declare(strict_types=1);
namespace AACSearch\SDK\Errors;
class ImportError extends AACSearchError { public readonly mixed $importResults; public function __construct(string $m='', mixed $r=null) { parent::__construct($m); $this->importResults=$r; } }
