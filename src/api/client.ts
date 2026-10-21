import { createApiFromEnv, type CloudApi } from '.';

let current: CloudApi | null = null;

/** Single API instance shared by all stores; tests swap it with `setApi`. */
export function api(): CloudApi {
  if (!current) current = createApiFromEnv();
  return current;
}

export function setApi(next: CloudApi): void {
  current = next;
}
