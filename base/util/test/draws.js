// A rand() giving these draws in order, for every package's tests.
export function draws(...values) {
  let i = 0;
  return () => values[i++];
}
