import AACSearchError from './AACSearchError';

export default class ImportError extends AACSearchError {
  importResults: unknown;

  constructor(message: string, importResults: unknown) {
    super(message);
    this.name = 'ImportError';
    this.importResults = importResults;
  }
}
