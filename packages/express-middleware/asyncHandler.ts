import express from "express";

export function asyncHandler(
  handler: (
    req: express.Request,
    res: express.Response,
    next: () => void
  ) => Promise<void>
) {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    return handler(req, res, next).catch(err => next(err));
  };
}
