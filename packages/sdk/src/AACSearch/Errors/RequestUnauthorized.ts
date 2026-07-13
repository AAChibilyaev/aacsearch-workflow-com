import HTTPError from './HTTPError';

export default class RequestUnauthorized extends HTTPError {
  constructor(message: string = 'Request unauthorized') {
    super(message, 401, 'unauthorized');
    this.name = 'RequestUnauthorized';
  }
}
