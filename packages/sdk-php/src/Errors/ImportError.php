<?php

declare(strict_types=1);

namespace AACSearch\SDK\Errors;

class ImportError extends AACSearchError
{
    /** @var mixed */
    public readonly mixed $importResults;

    public function __construct(string $message = '', mixed $importResults = null)
    {
        parent::__construct($message);
        $this->importResults = $importResults;
    }
}
