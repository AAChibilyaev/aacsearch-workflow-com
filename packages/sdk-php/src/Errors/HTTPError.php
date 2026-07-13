<?php
declare(strict_types=1);
namespace AACSearch\SDK\Errors;
class HTTPError extends AACSearchError { public function __construct(string $m='', int $s=0, ?string $c=null) { parent::__construct($m,$s,$c); } }
