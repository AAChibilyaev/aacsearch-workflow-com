# AACSearch OS — Lago Billing: Полное руководство

> **Lago** — open-source биллинг-движок AACSearch OS. Usage-based, subscription-based,
> гибридные модели. Полное руководство по интеграции и использованию.

---

# 1. АРХИТЕКТУРА БИЛЛИНГА

```
┌──────────────────────────────────────────────────────────────────┐
│                        LAGO (биллинг)                            │
│                                                                  │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐    │
│  │ Plans       │    │ Subscriptions │    │ Wallets          │    │
│  │ (тарифы)    │    │ (подписки)    │    │ (кошельки)       │    │
│  └──────┬──────┘    └──────┬───────┘    └───────┬──────────┘    │
│         │                  │                     │               │
│         ▼                  ▼                     ▼               │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                    EVENTS (события)                       │    │
│  │  • search_requests  — поисковые запросы                  │    │
│  │  • ingested_records — импортированные записи             │    │
│  │  • ai_tokens        — токены AI-поиска                   │    │
│  │  • team_members     — пользователи в тенанте             │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                  WEBHOOKS → AACSearch OS                  │    │
│  │  • subscription.started / updated / cancelled             │    │
│  │  • invoice.created / paid                                 │    │
│  │  • wallet.transaction.created                             │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

---

# 2. МОДЕЛИ БИЛЛИНГА

## 2.1 Pay-as-you-go (оплата за использование)

Каждый поисковый запрос = событие. Счёт в конце месяца.

```ts
// В AACSearch OS: searchGateway автоматически метрит usage
// После каждого поискового запроса:
await emitUsageEvent({
  tenant: 123,
  code: 'search_requests',
  properties: { requests: 1 },
  transactionId: deterministicHash  // SHA-256 для идемпотентности
});
```

**Lago конфигурация:**
- Billable metric: `search_requests` (тип: `count_agg`)
- План: Starter ($29/мес) — включает 10,000 запросов, сверх $0.001/запрос
- План: Pro ($99/мес) — включает 100,000 запросов, сверх $0.0005/запрос

## 2.2 Per-transaction (за транзакцию)

Каждый импортированный документ = событие.

```ts
await emitUsageEvent({
  tenant: 123,
  code: 'ingested_records',
  properties: { count: 150 },
  transactionId: deterministicHash
});
```

## 2.3 Per-seat (за пользователя)

Количество пользователей в тенанте = метрика.

```ts
// Обновляется при изменении команды
await lagoClient.events.createEvent({
  event: {
    transaction_id: deterministicHash,
    external_subscription_id: subId,
    code: 'team_members',
    timestamp: now,
    properties: { members: 5 }
  }
});
```

## 2.4 Per-token (AI-поиск)

Токены AI-поиска = метрика. Для semantic search, conversational search, NL search.

```ts
await emitUsageEvent({
  tenant: 123,
  code: 'ai_tokens',
  properties: { input_tokens: 500, output_tokens: 200 },
  transactionId: deterministicHash
});
```

## 2.5 Hybrid (комбинированная)

Подписка $49/мес + usage:
- Включает: 50,000 поисковых запросов, 5 пользователей
- Сверх: $0.001/запрос, $10/пользователь, $0.01/1K AI-токенов

---

# 3. ТАРИФЫ AACSEARCH OS

| Тариф | Цена | Документы | Коллекции | Интеграции | Поиск/мес | AI | Пользователи |
|-------|------|:---:|:---:|:---:|:---:|:---:|:---:|
| **Free** | $0 | 1,000 | 1 | 1 | 1,000 | ❌ | 1 |
| **Starter** | $29/мес | 50,000 | 5 | 3 | 10,000 | ✅ | 3 |
| **Pro** | $99/мес | 500,000 | 20 | 10 | 100,000 | ✅ | 10 |
| **Enterprise** | Кастом | ∞ | ∞ | ∞ | ∞ | ✅ | ∞ |

## 3.1 Free-тир метрики:
- 1,000 документов
- 1 коллекция
- 1 интеграция
- 1,000 поисковых запросов/мес
- Без AI-поиска
- 1 пользователь
- 14 дней хранения аналитики

## 3.2 Overage (превышение):
- Документы сверх лимита: $0.50/1,000
- Поисковые запросы сверх: Starter $0.001, Pro $0.0005
- AI-токены: $0.01/1K токенов
- Пользователи сверх: $10/пользователь

---

# 4. ИНТЕГРАЦИЯ LAGO В AACSEARCH OS

## 4.1 Lago Client

```ts
// src/lib/billing/client.ts
import { Client } from 'lago-javascript-client';

let client: ReturnType<typeof Client> | null = null;

export const getLagoClient = () => {
  if (client) return client;
  if (!process.env.LAGO_API_KEY || !process.env.LAGO_API_URL) return null;
  client = Client(process.env.LAGO_API_KEY, {
    baseUrl: process.env.LAGO_API_URL,
    rateLimitRetry: {}  // авто-ретрай при 429
  });
  return client;
};
```

## 4.2 Webhook Verification

```ts
// JWT RS256 (основной метод)
async function verifyBillingWebhook({ signature, rawBody, issuer, publicKey }) {
  // 1. Разбор JWT: header.payload.signature
  const [headerB64, payloadB64, sigB64] = signature.split('.');
  const header = JSON.parse(base64urlDecode(headerB64));
  if (header.alg !== 'RS256') throw new Error('invalid algorithm');

  // 2. Проверка подписи
  const sigBytes = base64urlDecode(sigB64);
  const ok = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5', publicKey, sigBytes,
    new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  );
  if (!ok) throw new Error('invalid signature');

  // 3. Проверка claims
  const claims = JSON.parse(base64urlDecode(payloadB64));
  if (claims.iss !== issuer) throw new Error('invalid issuer');
  if (claims.exp <= now) throw new Error('expired');
  if (now - claims.iat > 300) throw new Error('too old');

  // 4. Возврат подписанного payload
  return JSON.parse(claims.data);
}
```

## 4.3 Dedup (защита от повторов)

```ts
// SHA-256 подписанного содержимого (не X-Lago-Unique-Key!)
const dedupKey = await sha256(JSON.stringify(signedPayload));
// Проверка: если dedupKey уже в кэше → reject (replay attack)
```

## 4.4 Webhook Handler

```ts
// src/plugins/lago.ts
async function handleWebhook(req) {
  const sig = req.headers.get('x-lago-signature');
  const body = await req.text();
  const publicKey = await fetchPublicKey();

  try {
    const event = await verifyBillingWebhook({ signature: sig, rawBody: body, issuer, publicKey });
    const dedupKey = await sha256(JSON.stringify(event));

    // Проверка на повтор
    if (await isDuplicate(dedupKey)) return Response.json({ ok: true });

    // Зеркалирование в D1
    switch (event.event_type) {
      case 'subscription.started':
      case 'subscription.updated':
      case 'subscription.cancelled':
        await mirrorSubscription(event.subscription);
        break;
      case 'invoice.created':
      case 'invoice.paid':
        await mirrorInvoice(event.invoice);
        break;
      case 'wallet.transaction.created':
        await mirrorWalletTransaction(event.wallet_transaction);
        break;
    }

    // Инвалидация кэша entitlements
    await invalidateEntitlementsCache(event.customer?.external_id);

    await markDuplicate(dedupKey);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: 'invalid webhook' }, { status: 400 });
  }
}
```

## 4.5 Usage Metering (fire-and-forget)

```ts
// src/lib/billing/usage.ts
export async function emitUsageEvent({ tenant, code, properties, transactionId }) {
  const client = getLagoClient();
  if (!client) return;  // биллинг отключён

  const subId = await getSubscriptionId(tenant);
  if (!subId) return;

  try {
    await client.events.createEvent({
      event: {
        transaction_id: transactionId || deterministicTransactionId(tenant, code, properties),
        external_subscription_id: subId,
        code,
        timestamp: Math.floor(Date.now() / 1000).toString(),
        properties
      }
    });
  } catch (err) {
    // FIRE-AND-FORGET: никогда не бросаем исключение
    // Ошибка биллинга не должна ломать поиск/ingestion
    logger.warn({ err, tenant, code }, 'usage event failed');
  }
}
```

---

# 5. BILLING API (клиентские эндпоинты)

## 5.1 Проверка тарифов

```bash
# Все доступные тарифы
curl "https://search.aacsearch.ru/api/billing/plans?tenant=123"   -H "Authorization: api-keys API-Key KEY"

# Текущий тариф и использование
curl "https://search.aacsearch.ru/api/billing/summary?tenant=123"   -H "Authorization: api-keys API-Key KEY"
```

## 5.2 Управление подпиской

```bash
# Подписаться
curl -X POST "https://search.aacsearch.ru/api/billing/subscribe"   -H "Authorization: api-keys API-Key KEY"   -d '{"tenant":123,"planCode":"starter"}'

# Отменить
curl -X POST "https://search.aacsearch.ru/api/billing/cancel"   -H "Authorization: api-keys API-Key KEY"   -d '{"tenant":123}'
```

## 5.3 Счета и кошелёк

```bash
# Список счетов
curl "https://search.aacsearch.ru/api/billing/invoices?tenant=123"   -H "Authorization: api-keys API-Key KEY"

# Скачать PDF
curl "https://search.aacsearch.ru/api/billing/invoices/inv-001/download?tenant=123"   -H "Authorization: api-keys API-Key KEY"   --output invoice.pdf

# Баланс кошелька
curl "https://search.aacsearch.ru/api/billing/wallet?tenant=123"   -H "Authorization: api-keys API-Key KEY"

# Пополнить
curl -X POST "https://search.aacsearch.ru/api/billing/wallet/topup"   -H "Authorization: api-keys API-Key KEY"   -d '{"tenant":123,"amountCents":5000}'
```

---

# 6. ENTITLEMENTS (квоты)

## 6.1 Как работают квоты

```ts
// src/lib/billing/entitlements.ts
// Кэш entitlements: 60s TTL, LRU 500 записей
const entitlementsCache = new LRUCache<string, Record<string, number>>({ max: 500, ttl: 60000 });

async function getTenantEntitlements(tenantId: string) {
  // Читаем из зеркала tenants.billing.entitlements (D1)
  // НЕ из Lago API (быстро, работает оффлайн)
  const tenant = await payload.findByID({ collection: 'tenants', id: tenantId });
  return tenant.billing?.entitlements ?? {};
}

// Проверка при создании документа:
// if (currentCount >= entitlements.max_documents) → 403 PLAN_LIMIT
```

## 6.2 Типы квот

| Ключ | Тип | Описание |
|------|-----|----------|
| `max_documents` | number | Максимум документов |
| `max_collection_definitions` | number | Максимум коллекций |
| `max_integrations` | number | Максимум интеграций |
| `max_team_members` | number | Максимум пользователей |
| `max_pages` | number | Максимум маркетинговых страниц |
| `ai_search` | boolean | AI-поиск включён |
| `semantic_search` | boolean | Семантический поиск включён |

## 6.3 Обработка PLAN_LIMIT

```ts
// Team invite: при превышении лимита
// → APIError(403, 'PLAN_LIMIT', 'Team member limit reached')
// → UI показывает prompt: "Upgrade your plan to add more members"

// Document create: при превышении
// → APIError(403, 'PLAN_LIMIT', 'Document limit reached')
// → UI показывает: "You've reached your plan's document limit"
```

---

## 📚 Навигация по документации

| [← CONNECTORS](./AACSEARCH_OS_CONNECTORS.md) | [🏠 Главная](./README.md) | [NANGO →](./AACSEARCH_OS_NANGO.md) |
|:---:|:---:|:---:|
