export const ErrorType = {
  NoError: 0,
  QuantizeGetError: 1,
  NoMatchTemplate: 2,
}

export class ColorError extends Error {
  kind = ErrorType.NoError;
  constructor(msg, kind) {
    super(msg);
    this.kind = kind;
  }
}