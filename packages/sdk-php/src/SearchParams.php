<?php

declare(strict_types=1);

namespace AACSearch\SDK;

/**
 * Fluent search query builder.
 *
 * Instead of raw arrays:
 *   ['q'=>'laptop', 'query_by'=>'title', 'filter_by'=>'price:>50000']
 *
 * Use:
 *   SearchParams::create()->q('laptop')->queryBy('title')->filter('price','>',50000)
 */
class SearchParams
{
    /** @var array<string,mixed> */
    private array $params = [];

    public static function create(): self { return new self(); }

    /** Search query string. */
    public function q(string $query): self { $this->params['q'] = $query; return $this; }

    /** Fields to search in. Pass multiple strings or comma-separated. */
    public function queryBy(string ...$fields): self {
        $this->params['query_by'] = implode(',', $fields); return $this;
    }

    /** Weights for query_by fields (comma-separated). */
    public function queryByWeights(string $weights): self { $this->params['query_by_weights'] = $weights; return $this; }

    /** Filter expression, e.g. "price:>100 && brand:=Dell" */
    public function filterBy(string $expr): self { $this->params['filter_by'] = $expr; return $this; }

    /** Convenience: filter(field, operator, value) → "field:op value" */
    public function filter(string $field, string $op, string|int|float $value): self {
        $existing = $this->params['filter_by'] ?? '';
        $clause = "{$field}:{$op}{$value}";
        $this->params['filter_by'] = $existing ? "{$existing} && {$clause}" : $clause;
        return $this;
    }

    /** Sort expression, e.g. "price:asc" or "price:asc,rating:desc" */
    public function sortBy(string $expr): self { $this->params['sort_by'] = $expr; return $this; }

    /** Convenience: sort(field, asc|desc) */
    public function sort(string $field, string $dir = 'asc'): self {
        $existing = $this->params['sort_by'] ?? '';
        $clause = "{$field}:{$dir}";
        $this->params['sort_by'] = $existing ? "{$existing},{$clause}" : $clause;
        return $this;
    }

    /** Facet fields (comma-separated). */
    public function facetBy(string $fields): self { $this->params['facet_by'] = $fields; return $this; }

    /** Convenience: facet(field1, field2, ...) */
    public function facet(string ...$fields): self { $this->params['facet_by'] = implode(',', $fields); return $this; }

    /** Max facet values returned per field. */
    public function maxFacetValues(int $n): self { $this->params['max_facet_values'] = $n; return $this; }

    /** Comma-separated fields to include in response. */
    public function includeFields(string $fields): self { $this->params['include_fields'] = $fields; return $this; }

    /** Comma-separated fields to exclude from response. */
    public function excludeFields(string $fields): self { $this->params['exclude_fields'] = $fields; return $this; }

    /** Highlights configuration string. */
    public function highlightFields(string $fields): self { $this->params['highlight_fields'] = $fields; return $this; }

    /** Number of typos to tolerate. */
    public function numTypos(int|string $n): self { $this->params['num_typos'] = (string) $n; return $this; }

    /** Typo tolerance threshold. */
    public function typoTokensThreshold(int $n): self { $this->params['typo_tokens_threshold'] = $n; return $this; }

    /** Pin specific hits by ID. */
    public function pinnedHits(string $ids): self { $this->params['pinned_hits'] = $ids; return $this; }

    /** Hide specific hits by ID. */
    public function hiddenHits(string $ids): self { $this->params['hidden_hits'] = $ids; return $this; }

    /** Pagination: page number. */
    public function page(int $n): self { $this->params['page'] = $n; return $this; }

    /** Results per page. */
    public function perPage(int $n): self { $this->params['per_page'] = $n; return $this; }

    /** Set any custom parameter. */
    public function set(string $key, mixed $value): self { $this->params[$key] = $value; return $this; }

    /** @return array<string,mixed> */
    public function toArray(): array { return $this->params; }
}
