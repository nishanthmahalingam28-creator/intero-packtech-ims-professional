// An error whose message is SAFE to show to the end user.
// Anything that is NOT an AppError is treated as an internal bug and is hidden from the client.
export class AppError extends Error {
  constructor(message, status = 400, code) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}
