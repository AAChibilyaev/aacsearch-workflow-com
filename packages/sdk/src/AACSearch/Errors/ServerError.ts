import HTTPError from './HTTPError';

export default class ServerError extends HTTPError {
  constructor(message: string = 'Server error') {
    super(message, 500, 'server_error');
    this.name = 'ServerError';
  }
}
