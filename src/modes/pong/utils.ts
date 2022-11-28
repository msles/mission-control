export function chunk<T>(list: readonly T[], n: number): readonly (readonly T[])[] {
  if (list.length <= n) {
    return [list];
  }
  return [list.slice(0, n), ...chunk(list.slice(n), n)];
}

export async function delayMilliseconds(ms: number): Promise<void> {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}