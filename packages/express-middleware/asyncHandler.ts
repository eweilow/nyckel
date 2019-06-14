import express from "express";

export function asyncHandler(
  handler: (
    req: express.Request,
    res: express.Response,
    next: () => void
  ) => Promise<void>
) {
  return async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      await handler(req, res, next);
    } catch (err) {
      next(err);
    }
  };
}
