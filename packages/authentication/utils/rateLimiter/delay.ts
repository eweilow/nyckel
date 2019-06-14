const delaySteps: number = 200;

export function calculateRateLimiterDelay(
  then: number,
  now: number,
  limit: number,
  used: number,
  untilNextRefresh: number
) {
  const timeSinceThen = now - then;
  const correctedUsed = Math.ceil(
    Math.max(0, used - timeSinceThen / untilNextRefresh)
  );

  const value = Math.min(
    untilNextRefresh,
    Math.max(0, untilNextRefresh * Math.pow(correctedUsed / limit, 5))
  );

  return delaySteps * Math.floor(value / delaySteps);
}
