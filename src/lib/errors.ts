export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: unknown) {
    super(400, message, "VALIDATION_ERROR", details);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Recurso no encontrado") {
    super(404, message, "NOT_FOUND");
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "No autorizado") {
    super(401, message, "UNAUTHORIZED");
  }
}

export class RateLimitError extends ApiError {
  constructor(message = "Demasiadas solicitudes") {
    super(429, message, "RATE_LIMIT");
  }
}
