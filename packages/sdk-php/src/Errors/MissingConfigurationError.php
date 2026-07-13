<?php

declare(strict_types=1);

namespace AACSearch\SDK\Errors;

class MissingConfigurationError extends AACSearchError
{
    public function __construct(string $message = 'Missing configuration')
    {
        parent::__construct($message);
    }
}
