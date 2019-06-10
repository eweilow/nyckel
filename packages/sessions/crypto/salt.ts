export function saltKey(id: string, ...salt: string[]) {
  return [id, ...salt].join("");
}
