<?php

declare(strict_types=1);

namespace AACSearch\SDK\Errors;

class ServerError extends HTTPError
{
    public function __construct(string $message = 'Server error')
    {
        parent::__construct($message, 500, 'server_error');
    }
}
