import type { ConfigurationOptions, Node } from './Types';

const DEFAULT_CONNECTION_TIMEOUT_SECONDS = 10;
const DEFAULT_HEALTHCHECK_INTERVAL_SECONDS = 15;
const DEFAULT_NUM_RETRIES = 3;
const DEFAULT_RETRY_INTERVAL_SECONDS = 1;
const DEFAULT_API_BASE_PATH = '/api/v1';
const DEFAULT_API_KEY_AUTH_COLLECTION = 'api-keys';

const normalizeApiPath = (path: string): string => {
  if (!path || path === '/') return '';
  const prefixed = path.startsWith('/') ? path : `/${path}`;
  return prefixed.endsWith('/') ? prefixed.slice(0, -1) : prefixed;
};

export default class Configuration {
  readonly apiKey: string;
  readonly nodes: Node[];
  readonly apiKeyAuthCollection: string;
  readonly useGatewayProxy: boolean;
  readonly nearestNode?: Node;
  readonly connectionTimeoutSeconds: number;
  readonly healthcheckIntervalSeconds: number;
  readonly numRetries: number;
  readonly retryIntervalSeconds: number;
  readonly sendApiKeyAsQueryParam: boolean;
  readonly cacheSearchResultsForSeconds: number;
  readonly useServerSideSearchCache: boolean;
  readonly logLevel: string;
  readonly additionalHeaders: Record<string, string>;

  private currentNodeIndex: number = 0;

  constructor(options: ConfigurationOptions) {
    this.apiKey = options.apiKey;
    if (!options.apiKey || options.apiKey.length === 0) {
      throw new Error('AACSearch API key is required');
    }

    const apiBasePath = normalizeApiPath(options.apiBasePath ?? DEFAULT_API_BASE_PATH);
    this.nodes = options.nodes.map((node) => ({
      ...node,
      protocol: node.protocol || 'https',
      port: node.port || 443,
      path: normalizeApiPath(node.path ?? apiBasePath),
    }));
    if (this.nodes.length === 0) {
      throw new Error('At least one AACSearch node is required');
    }

    this.nearestNode = options.nearestNode;
    this.connectionTimeoutSeconds =
      options.connectionTimeoutSeconds ?? DEFAULT_CONNECTION_TIMEOUT_SECONDS;
    this.healthcheckIntervalSeconds =
      options.healthcheckIntervalSeconds ?? DEFAULT_HEALTHCHECK_INTERVAL_SECONDS;
    this.numRetries = options.numRetries ?? DEFAULT_NUM_RETRIES;
    this.retryIntervalSeconds =
      options.retryIntervalSeconds ?? DEFAULT_RETRY_INTERVAL_SECONDS;
    this.apiKeyAuthCollection =
      options.apiKeyAuthCollection || DEFAULT_API_KEY_AUTH_COLLECTION;
    this.useGatewayProxy = options.useGatewayProxy ?? true;
    this.sendApiKeyAsQueryParam = options.sendApiKeyAsQueryParam ?? false;
    this.cacheSearchResultsForSeconds = options.cacheSearchResultsForSeconds ?? 0;
    this.useServerSideSearchCache = options.useServerSideSearchCache ?? false;
    this.logLevel = options.logLevel || 'warn';
    this.additionalHeaders = options.additionalHeaders || {};
  }

  get currentNode(): Node {
    return this.nodes[this.currentNodeIndex]!;
  }

  nextNode(): Node {
    this.currentNodeIndex = (this.currentNodeIndex + 1) % this.nodes.length;
    return this.currentNode;
  }

  baseUrl(node?: Node): string {
    const n = node || this.currentNode;
    return `${n.protocol}://${n.host}:${n.port}${n.path || ''}`;
  }
}
