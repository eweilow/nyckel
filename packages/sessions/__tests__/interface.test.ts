describe("public API", () => {
  const obj = require("../");

  it("should be correct", () => {
    expect(obj).toMatchSnapshot();
  });
});
