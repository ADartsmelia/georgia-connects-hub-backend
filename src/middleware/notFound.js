/**
 * 404 Not Found Middleware
 * Handles requests to non-existent routes
 */

export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
};
