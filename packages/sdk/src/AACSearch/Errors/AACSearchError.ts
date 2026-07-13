export default class AACSearchError extends Error {
  httpStatus?: number;
  code?: string;

  constructor(message: string, httpStatus?: number, code?: string) {
    super(message);
    this.name = 'AACSearchError';
    this.httpStatus = httpStatus;
    this.code = code;

    const errorCtor = Error as unknown as {
      captureStackTrace?: (target: object, constructorOpt?: unknown) => void;
    };
    if (typeof errorCtor.captureStackTrace === 'function') {
      errorCtor.captureStackTrace(this, this.constructor);
    }
  }
}
