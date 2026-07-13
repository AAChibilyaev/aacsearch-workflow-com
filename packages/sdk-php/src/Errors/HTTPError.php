<?php

declare(strict_types=1);

namespace AACSearch\SDK\Errors;

class HTTPError extends AACSearchError
{
    public function __construct(string $message = '', int $httpStatus = 0, ?string $code = null)
    {
        parent::__construct($message, $httpStatus, $code);
    }
}
