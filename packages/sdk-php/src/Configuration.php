<?php
declare(strict_types=1);
namespace AACSearch\SDK;

class Configuration
{
    private const DEFAULT_TIMEOUT_SECONDS = 30;
    private const DEFAULT_NUM_RETRIES = 3;

    public readonly string $apiKey;
    public readonly string $baseUrl;
    public readonly int $timeoutSeconds;
    public readonly int $numRetries;
    /** Default workspace/tenant ID for integrations & billing. Auto-detected from API key if omitted. */
    public readonly ?string $tenantId;

    /**
     * new Configuration('api-key')
     * new Configuration('api-key', baseUrl: 'https://...', tenantId: 'workspace-1')
     * new Configuration(['apiKey'=>'...', 'baseUrl'=>'...', 'tenantId'=>'...'])
     *
     * @param string|array{apiKey:string, baseUrl?:string, tenantId?:string, timeoutSeconds?:int, numRetries?:int} $options
     */
    public function __construct(
        string|array $options,
        ?string $baseUrl = null,
        ?string $tenantId = null,
    ) {
        if (is_string($options)) {
            $options = ['apiKey' => $options, 'baseUrl' => $baseUrl ?? 'https://api.aacsearch.ru'];
        }

        $this->apiKey = $options['apiKey'] ?? '';
        $this->baseUrl = rtrim($options['baseUrl'] ?? 'https://api.aacsearch.ru', '/');
        $this->timeoutSeconds = $options['timeoutSeconds'] ?? self::DEFAULT_TIMEOUT_SECONDS;
        $this->numRetries = $options['numRetries'] ?? self::DEFAULT_NUM_RETRIES;
        $this->tenantId = $options['tenantId'] ?? $tenantId;

        if ($this->apiKey === '') {
            throw new \InvalidArgumentException('API key is required');
        }
    }

    public function url(string $path): string { return $this->baseUrl . '/api' . $path; }
}
