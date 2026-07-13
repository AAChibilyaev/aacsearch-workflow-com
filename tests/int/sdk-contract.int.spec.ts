// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.fn()

describe('@aacsearch/sdk gateway contract', () => {
  beforeEach(() => {
    request.mockReset()
  })

  it('defaults to the AACSearch gateway path and Payload api-key authorization', async () => {
    const { default: Configuration } = await import('@/../packages/sdk/src/AACSearch/Configuration')
    const { default: ApiCall } = await import('@/../packages/sdk/src/AACSearch/ApiCall')

    const config = new Configuration({
      apiKey: 'service-key',
      numRetries: 0,
      nodes: [{ host: 'tenant.example.com', port: 443, protocol: 'https' }],
    })

    expect(config.baseUrl()).toBe('https://tenant.example.com:443/api/v1')

    request.mockResolvedValueOnce({ data: { ok: true }, status: 200 })
    const apiCall = new ApiCall(config)
    ;(apiCall as unknown as { axiosInstances: Map<string, { request: typeof request }> }).axiosInstances.set(
      'tenant.example.com:443',
      { request },
    )
    await apiCall.get('/collections/products/documents/search', {
      q: 'chair',
      query_by: 'title',
    })

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          body: null,
          method: 'GET',
          path: '/collections/products/documents/search',
        },
        headers: expect.objectContaining({
          Authorization: 'api-keys API-Key service-key',
        }),
        method: 'post',
        params: { q: 'chair', query_by: 'title' },
        url: 'https://tenant.example.com:443/api/v1/proxy',
      }),
    )
  })

  it('leaves gateway-native multi-search on /multi_search', async () => {
    const { default: Configuration } = await import('@/../packages/sdk/src/AACSearch/Configuration')
    const { default: ApiCall } = await import('@/../packages/sdk/src/AACSearch/ApiCall')

    const config = new Configuration({
      apiKey: 'service-key',
      numRetries: 0,
      nodes: [{ host: 'tenant.example.com', port: 443, protocol: 'https' }],
    })

    request.mockResolvedValueOnce({ data: { results: [] }, status: 200 })
    const apiCall = new ApiCall(config)
    ;(apiCall as unknown as { axiosInstances: Map<string, { request: typeof request }> }).axiosInstances.set(
      'tenant.example.com:443',
      { request },
    )
    await apiCall.post('/multi_search', { searches: [] }, { per_page: 10 })

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { searches: [] },
        method: 'post',
        params: { per_page: 10 },
        url: 'https://tenant.example.com:443/api/v1/multi_search',
      }),
    )
  })
})
