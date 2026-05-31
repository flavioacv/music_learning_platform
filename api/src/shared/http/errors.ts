export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function badRequest(message: string, code = 'bad_request') {
  return new AppError(400, code, message);
}

export function unauthorized(message = 'Authentication required') {
  return new AppError(401, 'unauthorized', message);
}

export function conflict(message: string, code = 'conflict') {
  return new AppError(409, code, message);
}

export function notFound(message: string, code = 'not_found') {
  return new AppError(404, code, message);
}
