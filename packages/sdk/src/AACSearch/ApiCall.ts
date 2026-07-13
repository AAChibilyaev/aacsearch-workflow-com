import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import Configuration from './Configuration';
import type { Node } from './Types';
import HTTPError from './Errors/HTTPError';
import ObjectNotFound from './Errors/ObjectNotFound';
import ObjectAlreadyExists from './Errors/ObjectAlreadyExists';
import ObjectUnprocessable from './Errors/ObjectUnprocessable';
import RequestMalformed from './Errors/RequestMalformed';
import RequestUnauthorized from './Errors/RequestUnauthorized';
import ServerError from './Errors/ServerError';

const DEFAULT_RETRY_MS = 1000;

export default class ApiCall {
  private readonly configuration: Configuration;
  private axiosInstances: Map<string, AxiosInstance> = new Map();

  constructor(configuration: Configuration) {
    this.configuration = configuration;
  }

  async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>('get', endpoint, { params });
  }

  async post<T>(endpoint: string, body?: unknown, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>('post', endpoint, { params }, body);
  }

  async put<T>(endpoint: string, body?: unknown, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>('put', endpoint, { params }, body);
  }

  async patch<T>(endpoint: string, body?: unknown, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>('patch', endpoint, { params }, body);
  }

  async delete<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>('delete', endpoint, { params });
  }

  private async request<T>(
    method: string,
    endpoint: string,
    axiosParams: { params?: Record<string, unknown> } = {},
    body?: unknown,
  ): Promise<T> {
    const numRetries = this.configuration.numRetries;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= numRetries; attempt++) {
      const node = attempt === 0
        ? this.configuration.currentNode
        : this.configuration.nextNode();

      try {
        const result = await this.performRequest<T>(method, endpoint, node, axiosParams, body);
        return result;
      } catch (error) {
        lastError = error as Error;
        // Only retry on server errors (500+) or network errors
        if (error instanceof ServerError || error instanceof HTTPError === false || (error as HTTPError)?.httpStatus && (error as HTTPError).httpStatus! >= 500) {
          if (attempt < numRetries) {
            await this.sleep(DEFAULT_RETRY_MS * (attempt + 1));
            continue;
          }
        }
        throw error;
      }
    }

    throw lastError!;
  }

  private async performRequest<T>(
    method: string,
    endpoint: string,
    node: Node,
    axiosParams: { params?: Record<string, unknown> },
    body?: unknown,
  ): Promise<T> {
    const url = `${node.protocol}://${node.host}:${node.port}${node.path || ''}${endpoint}`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.configuration.apiKey}`,
      'Content-Type': 'application/json',
      ...this.configuration.additionalHeaders,
    };

    const config: AxiosRequestConfig = {
      method: method as AxiosRequestConfig['method'],
      url,
      headers,
      params: axiosParams.params,
      data: body,
      timeout: this.configuration.connectionTimeoutSeconds * 1000,
      validateStatus: (status) => status >= 200 && status < 600,
    };

    const instance = this.getAxiosInstance(node);
    const response = await instance.request(config);

    if (response.status >= 200 && response.status < 300) {
      return response.data as T;
    }

    throw this.customError(response);
  }

  private getAxiosInstance(node: Node): AxiosInstance {
    const key = `${node.host}:${node.port}`;
    if (!this.axiosInstances.has(key)) {
      this.axiosInstances.set(
        key,
        axios.create({
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }),
      );
    }
    return this.axiosInstances.get(key)!;
  }

  private customError(response: { status: number; data: unknown }): HTTPError {
    const status = response.status;
    const data = response.data as { message?: string } | undefined;
    const message = data?.message || `HTTP error ${status}`;

    switch (status) {
      case 400: return new RequestMalformed(message);
      case 401: return new RequestUnauthorized(message);
      case 404: return new ObjectNotFound(message);
      case 409: return new ObjectAlreadyExists(message);
      case 422: return new ObjectUnprocessable(message);
      case 500: case 502: case 503: case 504: return new ServerError(message);
      default: return new HTTPError(message, status);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
