<?php

declare(strict_types=1);

namespace AACSearch\SDK\Errors;

class ObjectAlreadyExists extends HTTPError
{
    public function __construct(string $message = 'Object already exists')
    {
        parent::__construct($message, 409, 'already_exists');
    }
}
