import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Middleware factory that validates request data against a Zod schema.
 * Supports validating body, query params, or route params.
 */
export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = schema.parse(req[target]);
      // Replace the target with parsed (and potentially transformed) data
      (req as Record<string, unknown>)[target] = data;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code,
        }));

        res.status(400).json({
          error: 'ValidationError',
          message: 'Request validation failed',
          details: errors,
        });
        return;
      }

      next(err);
    }
  };
}

/**
 * Validate multiple targets at once.
 */
export function validateAll(schemas: Partial<Record<ValidationTarget, ZodSchema>>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const allErrors: Array<{ target: string; field: string; message: string }> = [];

    for (const [target, schema] of Object.entries(schemas) as Array<[ValidationTarget, ZodSchema]>) {
      try {
        const data = schema.parse(req[target]);
        (req as Record<string, unknown>)[target] = data;
      } catch (err) {
        if (err instanceof ZodError) {
          for (const e of err.errors) {
            allErrors.push({
              target,
              field: e.path.join('.'),
              message: e.message,
            });
          }
        }
      }
    }

    if (allErrors.length > 0) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'Request validation failed',
        details: allErrors,
      });
      return;
    }

    next();
  };
}
