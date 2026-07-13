<?php
declare(strict_types=1);
namespace AACSearch\SDK;

class Billing
{
    public function __construct(private readonly ApiCall $api, private readonly ?Configuration $config = null) {}

    /** Default tenant from client configuration. */
    private function tenant(?string $override): string {
        $tid = $override ?? $this->config?->tenantId;
        if (!$tid) throw new \InvalidArgumentException('tenantId is required — pass to constructor: new Client(key, tenantId: "workspace-1")');
        return $tid;
    }

    public function plans(): array { return $this->api->get('/billing/plans'); }

    /** @param string|null $tenantId Override or use default from client */
    public function summary(?string $tenantId = null): array {
        return $this->api->get('/billing/summary', ['tenant' => $this->tenant($tenantId)]);
    }

    /** @param string|null $tenantId Override or use default from client */
    public function event(string $code, array $properties = [], ?string $tenantId = null, ?string $transactionId = null): array {
        $body = ['tenant' => $this->tenant($tenantId), 'code' => $code, 'properties' => $properties];
        if ($transactionId !== null) $body['transactionId'] = $transactionId;
        return $this->api->post('/billing/events', $body);
    }
}
