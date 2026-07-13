import HTTPError from './HTTPError';

export default class ObjectAlreadyExists extends HTTPError {
  constructor(message: string = 'Object already exists') {
    super(message, 409, 'already_exists');
    this.name = 'ObjectAlreadyExists';
  }
}
