export function calculateRateLimiterDelay(
  then: number,
  now: number,
  limit: number,
  used: number,
  untilNextRefresh: number,
  delaySteps: number = 200
) {
  const correctedUsed = Math.ceil(
    Math.max(0, used - (now - then) / untilNextRefresh)
  );

  const value = Math.min(
    untilNextRefresh,
    Math.max(0, untilNextRefresh * Math.pow(correctedUsed / limit, 5))
  );

  return delaySteps * Math.floor(value / delaySteps);
}
