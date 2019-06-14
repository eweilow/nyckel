export function createPromiseDebounce<TIn, TData, TOut>(
  createPromise: (input: TIn) => Promise<TData>,
  mapResult: (value: TData) => TOut,
  isExpired: (data: TData) => boolean
) {
  let cachedResult: TData | null = null;
  let currentlyFetching: Promise<TData> | null = null;

  const debouncer = {
    async get(input: TIn): Promise<TOut> {
      if (cachedResult == null) {
        if (currentlyFetching == null) {
          currentlyFetching = createPromise(input);
          cachedResult = await currentlyFetching;
          currentlyFetching = null;
          return mapResult(cachedResult);
        } else {
          const fetched = await currentlyFetching;
          return mapResult(fetched);
        }
      }

      if (!isExpired(cachedResult)) {
        return mapResult(cachedResult);
      } else {
        cachedResult = null;
        return debouncer.get(input);
      }
    }
  };

  return debouncer;
}
