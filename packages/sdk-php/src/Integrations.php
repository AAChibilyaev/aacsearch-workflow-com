<?php
declare(strict_types=1);
namespace AACSearch\SDK;

class Integrations
{
    public function __construct(private readonly ApiCall $api, private readonly ?Configuration $config = null) {}

    /** Default tenant from client configuration. */
    private function tenant(?string $override): string {
        $tid = $override ?? $this->config?->tenantId;
        if (!$tid) throw new \InvalidArgumentException('tenantId is required — pass to constructor: new Client(key, tenantId: "workspace-1")');
        return $tid;
    }

    /** @param string|null $tenantId Override or use default from client */
    public function catalog(?string $tenantId = null): array {
        return $this->api->get('/integrations/catalog', ['tenant' => $this->tenant($tenantId)]);
    }

    /** @param string|null $tenantId Override or use default from client */
    public function connections(?string $tenantId = null): array {
        return $this->api->get('/integrations/connections', ['tenant' => $this->tenant($tenantId)]);
    }

    /** @param string|null $tenantId Override or use default from client */
    public function session(?string $tenantId = null, ?string $provider = null): array {
        $body = ['tenant' => $this->tenant($tenantId)];
        if ($provider !== null) $body['integration'] = $provider;
        return $this->api->post('/integrations/session', $body);
    }

    /** @param string|null $tenantId Override or use default from client */
    public function disconnect(string $connectionId, ?string $tenantId = null): array {
        return $this->api->delete('/integrations/connections/' . urlencode($connectionId), ['tenant' => $this->tenant($tenantId)]);
    }

    public function logoUrl(string $providerKey): string {
        return '/api/integrations/logo/' . urlencode($providerKey);
    }
}
