<?php

declare(strict_types=1);

namespace AACSearch\SDK\Errors;

class RequestMalformed extends HTTPError
{
    public function __construct(string $message = 'Request malformed')
    {
        parent::__construct($message, 400, 'malformed');
    }
}
