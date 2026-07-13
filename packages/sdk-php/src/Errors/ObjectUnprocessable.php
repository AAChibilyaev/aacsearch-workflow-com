<?php

declare(strict_types=1);

namespace AACSearch\SDK\Errors;

class ObjectUnprocessable extends HTTPError
{
    public function __construct(string $message = 'Object unprocessable')
    {
        parent::__construct($message, 422, 'unprocessable');
    }
}
