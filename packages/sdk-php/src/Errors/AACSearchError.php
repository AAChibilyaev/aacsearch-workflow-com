<?php
declare(strict_types=1);
namespace AACSearch\SDK\Errors;

class AACSearchError extends \RuntimeException {
    public readonly ?int $httpStatus;
    public readonly ?string $errorCode;
    public function __construct(string $message = '', ?int $httpStatus = null, ?string $code = null) {
        parent::__construct($message); $this->httpStatus = $httpStatus; $this->errorCode = $code;
    }
}
