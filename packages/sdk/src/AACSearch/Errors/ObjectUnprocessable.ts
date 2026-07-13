import HTTPError from './HTTPError';

export default class ObjectUnprocessable extends HTTPError {
  constructor(message: string = 'Object unprocessable') {
    super(message, 422, 'unprocessable');
    this.name = 'ObjectUnprocessable';
  }
}
