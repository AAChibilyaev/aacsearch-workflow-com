import AACSearchError from './AACSearchError';

export default class MissingConfigurationError extends AACSearchError {
  constructor(message: string = 'Missing configuration') {
    super(message);
    this.name = 'MissingConfigurationError';
  }
}
