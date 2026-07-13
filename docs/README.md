# AACSearch OS — Документация

> **AACSearch OS** — мульти-тенантная SaaS-платформа поиска.
> Payload CMS 3.86 + Cloudflare Workers + Typesense + Lago + Nango + Airbyte.

---

## 🗺️ Карта документации

```
                    ┌─────────────────────────────────┐
                    │     README.md (этот файл)        │
                    │     Индекс и навигация           │
                    └──────────┬──────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────────┐
        ▼                      ▼                          ▼
┌───────────────┐    ┌──────────────────┐    ┌──────────────────────┐
│ АРХИТЕКТУРА   │    │ ENHANCED          │    │ ULTIMATE              │
│ Обзор системы │    │ InstantSearch     │    │ 50+ репо Typesense    │
│ Сравнение     │    │ Dashboard         │    │ DocSearch, RAG        │
│ с конкурентами│    │ 25+ виджетов      │    │ AI, Geo, фреймворки   │
└───────┬───────┘    └────────┬─────────┘    └───────────┬──────────┘
        │                     │                          │
        ▼                     ▼                          ▼
┌───────────────┐    ┌──────────────────┐    ┌──────────────────────┐
│ COMPLETE      │    │ DEFINITIVE        │    │ PRODUCTION            │
│ REFERENCE     │    │ Ограничения       │    │ Env matrix            │
│ Все API       │    │ Интеграции        │    │ CI/CD                 │
│ Все страницы  │    │ Безопасность      │    │ Security audit        │
│ Все SDK       │    │ Глубокий анализ   │    │ DR, costs             │
└───────────────┘    └──────────────────┘    └──────────────────────┘
        │                     │                          │
        └─────────────────────┼──────────────────────────┘
                              ▼
                    ┌──────────────────┐
                    │ MASTER            │
                    │ Технический       │
                    │ мастер-документ   │
                    │ (конспект всего)  │
                    └──────────────────┘
```

## 📖 Рекомендуемый порядок чтения

| # | Документ | Для кого | Время чтения |
|---|----------|----------|:---:|
| 1 | [ARCHITECTURE](./AACSEARCH_OS_ARCHITECTURE.md) | Все | 15 мин |
| 2 | [COMPLETE REFERENCE](./AACSEARCH_OS_COMPLETE_REFERENCE.md) | Разработчики | 45 мин |
| 3 | [TYPESENSE V31](./AACSEARCH_OS_TYPESENSE_V31.md) | Разработчики | 35 мин |
| 4 | [ENHANCED](./AACSEARCH_OS_ENHANCED.md) | Frontend-разработчики | 25 мин |
| 5 | [ULTIMATE](./AACSEARCH_OS_ULTIMATE.md) | Архитекторы | 25 мин |
| 6 | [DEFINITIVE](./AACSEARCH_OS_DEFINITIVE.md) | Техлид / Архитектор | 35 мин |
| 7 | [PRODUCTION](./AACSEARCH_OS_PRODUCTION.md) | DevOps / SRE | 25 мин |
| 8 | [MASTER](./AACSEARCH_OS_MASTER.md) | Быстрый конспект | 10 мин |

## 📚 Описание документов

### 1. [ARCHITECTURE](./AACSEARCH_OS_ARCHITECTURE.md) — Общая архитектура
**Краткий обзор системы.** ASCII-диаграмма архитектуры, список всех компонентов, сравнение с Algolia и CocoIndex.
- Стек и компоненты
- Почему лучше конкурентов
- Дорожная карта (3 фазы)

> 📎 См. также: [DEFINITIVE](./AACSEARCH_OS_DEFINITIVE.md) для глубокого анализа ограничений

### 2. [COMPLETE REFERENCE](./AACSEARCH_OS_COMPLETE_REFERENCE.md) — Полный справочник
**Каждый API-эндпоинт, каждая страница, каждый метод SDK.** 987 строк.
- Все 50+ API эндпоинтов AACSearch OS
- Все 12 Admin UI страниц с компонентами
- TypeScript SDK (14 категорий) + PHP SDK
- 60+ контентных блоков
- Все 13 коллекций с полными схемами

> 📎 См. также: [TYPESENSE V31](./AACSEARCH_OS_TYPESENSE_V31.md) для полного Typesense API

### 3. [TYPESENSE V31](./AACSEARCH_OS_TYPESENSE_V31.md) — Полный Typesense API
**Все эндпоинты Typesense v31, все 80+ параметров, все AI-возможности.** 797 строк.
- 24 категории возможностей
- 15 типов API эндпоинтов (Collections, Documents, Synonyms, Curation, ...)
- 80+ search параметров (базовые, AI, ранжирование, опечатки, группировка, ...)
- 6 AI-возможностей: Semantic, Hybrid, RAG, NL Search, Image, Voice
- Рекомендательная система (similar items, trending, personalization)
- Полные примеры кода

> 📎 См. также: [ENHANCED](./AACSEARCH_OS_ENHANCED.md) для InstantSearch виджетов
**Каждый API-эндпоинт, каждая страница, каждый метод SDK.** 974 строки.
- Все 50+ API эндпоинтов с методами и описанием
- Все 12 Admin UI страниц с компонентами
- TypeScript SDK (14 категорий) + PHP SDK
- 60+ контентных блоков
- Все 13 коллекций с ПОЛНЫМИ схемами полей

> 📎 См. также: [ENHANCED](./AACSEARCH_OS_ENHANCED.md) для InstantSearch виджетов

### 4. [ENHANCED](./AACSEARCH_OS_ENHANCED.md) — Расширенные возможности
**InstantSearch.js, Typesense Dashboard, showcase-приложения.** 559 строк.
- 25+ InstantSearch виджетов с примерами кода
- 3 уровня поискового UI (CDN Widget → InstantSearch → SDK)
- 15 расширенных фич поиска
- Typesense Dashboard интеграция

> 📎 См. также: [ULTIMATE](./AACSEARCH_OS_ULTIMATE.md) для полной экосистемы Typesense

### 5. [ULTIMATE](./AACSEARCH_OS_ULTIMATE.md) — Экосистема Typesense
**Все 50+ репозиториев Typesense на GitHub.** 514 строк.
- DocSearch (5 фреймворков)
- Showcase (15+ фреймворков)
- AI/ML, RAG, Geo
- 15 типов полей + 50+ search параметров
- Расширенное сравнение с Algolia, Elasticsearch, Meilisearch

> 📎 См. также: [ENHANCED](./AACSEARCH_OS_ENHANCED.md) для практических примеров

### 6. [DEFINITIVE](./AACSEARCH_OS_DEFINITIVE.md) — Архитектурный анализ
**Ограничения платформы и интеграций.** 748 строк.
- Cloudflare Workers: bundle limit, no sharp, isolates, D1
- Payload CMS: версионирование, build-time vs runtime, access control
- Typesense: двойная синхронизация, scoped keys, settings sync
- Lago: верификация вебхуков, идемпотентность, квоты
- Nango: ingestion pipeline, обработка ошибок
- Сильные/слабые стороны, матрица рисков

> 📎 См. также: [PRODUCTION](./AACSEARCH_OS_PRODUCTION.md) для практического деплоя

### 7. [PRODUCTION](./AACSEARCH_OS_PRODUCTION.md) — Production-анализ
**Практическое руководство по запуску.** 489 строк.
- Матрица ВСЕХ 25+ env переменных с взаимозависимостями
- CI/CD pipeline
- Security audit (10 поверхностей атаки, pre-prod checklist)
- Производительность и масштабирование
- Миграция с Algolia/Elasticsearch/Meilisearch
- Disaster recovery, оптимизация затрат

> 📎 См. также: [DEFINITIVE](./AACSEARCH_OS_DEFINITIVE.md) для теоретического обоснования

### 8. [MASTER](./AACSEARCH_OS_MASTER.md) — Технический конспект
**Сжатый конспект всего репозитория.** 194 строки.
- Payload CMS internals
- Access control 4-layer
- Typesense dual-sync
- Lago webhook verification
- Nango ingestion
- Testing strategy
- Production checklist

> 📎 Это конспект — подробности в остальных документах

## 🔗 Быстрые ссылки по темам

| Тема | Где читать |
|------|-----------|
| **API эндпоинты** | [COMPLETE REFERENCE, Часть I](./AACSEARCH_OS_COMPLETE_REFERENCE.md) |
| **Admin UI** | [COMPLETE REFERENCE, Часть II](./AACSEARCH_OS_COMPLETE_REFERENCE.md) |
| **SDK методы** | [COMPLETE REFERENCE, Часть III](./AACSEARCH_OS_COMPLETE_REFERENCE.md) |
| **Коллекции** | [COMPLETE REFERENCE, Часть V](./AACSEARCH_OS_COMPLETE_REFERENCE.md) |
| **Поисковые фичи** | [ENHANCED, Часть I](./AACSEARCH_OS_ENHANCED.md) |
| **Typesense экосистема** | [ULTIMATE](./AACSEARCH_OS_ULTIMATE.md) |
| **Ограничения платформы** | [DEFINITIVE, Часть 0](./AACSEARCH_OS_DEFINITIVE.md) |
| **Access Control** | [MASTER, Часть II](./AACSEARCH_OS_MASTER.md) или [DEFINITIVE, Часть I-3](./AACSEARCH_OS_DEFINITIVE.md) |
| **Lago биллинг** | [DEFINITIVE, Часть III](./AACSEARCH_OS_DEFINITIVE.md) |
| **Nango интеграции** | [DEFINITIVE, Часть IV](./AACSEARCH_OS_DEFINITIVE.md) |
| **Airbyte пайплайны** | [DEFINITIVE, Часть V](./AACSEARCH_OS_DEFINITIVE.md) |
| **Деплой** | [PRODUCTION, Часть I](./AACSEARCH_OS_PRODUCTION.md) |
| **Безопасность** | [PRODUCTION, Часть II](./AACSEARCH_OS_PRODUCTION.md) |
| **Миграция** | [PRODUCTION, Часть VI](./AACSEARCH_OS_PRODUCTION.md) |
| **Масштабирование** | [PRODUCTION, Часть IV](./AACSEARCH_OS_PRODUCTION.md) |
| **Чек-лист** | [PRODUCTION, Часть IX](./AACSEARCH_OS_PRODUCTION.md) или [MASTER, Часть IX](./AACSEARCH_OS_MASTER.md) |
| **Roadmap** | [ARCHITECTURE, Часть 14](./AACSEARCH_OS_ARCHITECTURE.md) или [ULTIMATE, Часть IV](./AACSEARCH_OS_ULTIMATE.md) |

---

## 📊 Статистика

| Метрика | Значение |
|---------|----------|
| Документов | **7** |
| Всего строк | **3,903** |
| Охвачено API эндпоинтов | **50+** |
| Охвачено коллекций | **13** (полные схемы) |
| Охвачено блоков | **60+** |
| Охвачено плагинов | **29** |
| Охвачено Typesense репо | **50+** |
| Язык | 🇷🇺 Русский |

---

**AACSearch OS** — документация, написанная на основе глубокого анализа кодовой базы.
*430+ исходных файлов, 42K строк TypeScript, 16 int + 2 E2E тестов.*
