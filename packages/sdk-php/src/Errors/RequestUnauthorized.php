<?php

declare(strict_types=1);

namespace AACSearch\SDK\Errors;

class RequestUnauthorized extends HTTPError
{
    public function __construct(string $message = 'Unauthorized')
    {
        parent::__construct($message, 401, 'unauthorized');
    }
}
