export async function wrapInPromise<T = any>(
  run: (cb: (err: any, data: T) => void) => void
) {
  return await new Promise<T>((resolve, reject) => {
    run((err, data) => {
      if (err != null) return reject(err);
      return resolve(data);
    });
  });
}
