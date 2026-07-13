import type { ConfigurationOptions, Node } from './Types';

const DEFAULT_CONNECTION_TIMEOUT_SECONDS = 10;
const DEFAULT_HEALTHCHECK_INTERVAL_SECONDS = 15;
const DEFAULT_NUM_RETRIES = 3;
const DEFAULT_RETRY_INTERVAL_SECONDS = 1;

export default class Configuration {
  readonly apiKey: string;
  readonly nodes: Node[];
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

    this.nodes = options.nodes.map((node) => ({
      ...node,
      protocol: node.protocol || 'https',
      port: node.port || 443,
      path: node.path || '',
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
