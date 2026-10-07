// Turns any error into a message a normal user can understand.
// Messages written by our own server (ApiError) are already user-friendly, so they are shown as they are.
// Anything unexpected becomes a generic sentence; raw details only go to the developer console.
export class AppError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AppError';
  }
}

export function friendlyError(err) {
  if (err instanceof AppError || err?.name === 'ApiError') return err.message;
  if (import.meta.env.DEV) console.error(err);
  return 'Something went wrong. Please try again.';
}
