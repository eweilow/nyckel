import { calculateRateLimiterDelay } from "../delay";

describe("calculateRateLimiterDelay", () => {
  const c: typeof calculateRateLimiterDelay = (...args) =>
    calculateRateLimiterDelay(...args);

  it("when now = then", () => {
    let obj = {};
    const limit = 10;
    for (let i = 0; i < limit * 1.5; i++) {
      for (
        let untilNextRefresh = 100;
        untilNextRefresh < 15000;
        untilNextRefresh += 700
      ) {
        obj[
          `limit ${limit
            .toString()
            .padStart(2, " ")} and used ${i
            .toString()
            .padStart(2, " ")} with ttr ${untilNextRefresh
            .toString()
            .padStart(5, " ")}`
        ] = c(1000, 1000, 10, i, untilNextRefresh);
      }
    }
    expect(obj).toMatchSnapshot();
  });

  for (let delta = 1000; delta < 60000; delta += 7500) {
    it("when now = then + " + delta, () => {
      let obj = {};
      const limit = 10;
      for (let i = 0; i <= limit; i++) {
        for (
          let untilNextRefresh = 100;
          untilNextRefresh < 15000;
          untilNextRefresh += 2400
        ) {
          obj[
            `limit ${limit
              .toString()
              .padStart(2, " ")} and used ${i
              .toString()
              .padStart(
                2,
                " "
              )} with ttr ${untilNextRefresh.toString().padStart(5, " ")}`
          ] = c(1000, 1000 + delta, 10, i, untilNextRefresh);
        }
      }
      expect(obj).toMatchSnapshot();
    });
  }
});
