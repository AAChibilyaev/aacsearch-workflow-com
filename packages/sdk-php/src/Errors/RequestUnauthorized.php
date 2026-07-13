<?php
declare(strict_types=1);
namespace AACSearch\SDK\Errors;
class RequestUnauthorized extends HTTPError { public function __construct(string $m='Unauthorized') { parent::__construct($m,401,'unauthorized'); } }
