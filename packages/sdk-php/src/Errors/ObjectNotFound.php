<?php

declare(strict_types=1);

namespace AACSearch\SDK\Errors;

class ObjectNotFound extends HTTPError
{
    public function __construct(string $message = 'Object not found')
    {
        parent::__construct($message, 404, 'not_found');
    }
}
