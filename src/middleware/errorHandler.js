import { AppError } from '../utils/AppError.js';

export function notFound(req, _res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

// The ONLY place where errors become HTTP responses.
//  - AppError  -> its own message (written to be user-friendly)
//  - everything else (bugs, database failures) -> logged on the server, generic message to the client,
//    so no stack traces, queries or database details ever leak out.
export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ message: err.message, code: err.code });
  }
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ message: 'The request body is not valid JSON.' });
  if (err?.type === 'entity.too.large') return res.status(413).json({ message: 'The request is too large.' });
  if (err?.code === 11000) return res.status(409).json({ message: 'A record with the same unique value already exists.' });
  if (err?.name === 'CastError') return res.status(400).json({ message: 'One of the identifiers is not valid.' });
  if (err?.name === 'ValidationError') return res.status(400).json({ message: 'Some of the values are not valid.' });

  console.error('Unexpected error:', err);
  return res.status(500).json({ message: 'Something went wrong. Please try again.' });
}
