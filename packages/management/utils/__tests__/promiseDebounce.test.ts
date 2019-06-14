import { createPromiseDebounce } from "../promiseDebounce";

describe("createPromiseDebounce", () => {
  it("should only call createPromise once before expiration", async () => {
    const createPromise = jest.fn(async input => input);
    const mapper = jest.fn(data => data);
    const debouncer = createPromiseDebounce(createPromise, mapper, () => false);

    const promise1 = debouncer.get("test");
    const promise2 = debouncer.get("test2");
    const promise3 = debouncer.get("test3");

    expect(createPromise).toBeCalledWith("test");
    expect(createPromise).toBeCalledTimes(1);

    const [a, b, c] = await Promise.all([promise1, promise2, promise3]);

    expect(mapper).toBeCalledWith("test");
    expect(mapper).toBeCalledTimes(3);

    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(a).toEqual("test");

    const d = await debouncer.get("test4");
    expect(d).toBe(a);
    expect(mapper).toBeCalledWith("test");
    expect(mapper).toBeCalledTimes(4);
  });

  it("should only call createPromise again after expiration", async () => {
    const createPromise = jest.fn(async input => input);
    const mapper = jest.fn(data => data);
    const debouncer = createPromiseDebounce(createPromise, mapper, () => true);

    const a = await debouncer.get("test");
    expect(createPromise).toBeCalledWith("test");
    expect(createPromise).toBeCalledTimes(1);
    expect(mapper).toBeCalledWith("test");
    expect(mapper).toBeCalledTimes(1);

    createPromise.mockClear();
    mapper.mockClear();
    const b = await debouncer.get("test1");
    expect(createPromise).toBeCalledWith("test1");
    expect(createPromise).toBeCalledTimes(1);
    expect(mapper).toBeCalledWith("test1");
    expect(mapper).toBeCalledTimes(1);

    expect(a).toEqual("test");
    expect(b).toEqual("test1");
  });
});
