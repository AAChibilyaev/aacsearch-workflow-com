import AACSearchError from './AACSearchError';

export default class HTTPError extends AACSearchError {
  constructor(message: string, httpStatus: number, code?: string) {
    super(message, httpStatus, code);
    this.name = 'HTTPError';
  }
}
