import HTTPError from './HTTPError';

export default class RequestMalformed extends HTTPError {
  constructor(message: string = 'Request malformed') {
    super(message, 400, 'malformed');
    this.name = 'RequestMalformed';
  }
}
