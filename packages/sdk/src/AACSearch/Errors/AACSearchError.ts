export default class AACSearchError extends Error {
  httpStatus?: number;
  code?: string;

  constructor(message: string, httpStatus?: number, code?: string) {
    super(message);
    this.name = 'AACSearchError';
    this.httpStatus = httpStatus;
    this.code = code;

    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }
}
