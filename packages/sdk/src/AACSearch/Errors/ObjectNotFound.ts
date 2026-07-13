import HTTPError from './HTTPError';

export default class ObjectNotFound extends HTTPError {
  constructor(message: string = 'Object not found') {
    super(message, 404, 'not_found');
    this.name = 'ObjectNotFound';
  }
}
