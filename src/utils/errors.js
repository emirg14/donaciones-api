'use strict';

/** Error de aplicación con código HTTP asociado. */
class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    if (details) this.details = details;
  }
}

module.exports = { AppError };
