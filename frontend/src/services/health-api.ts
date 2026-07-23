import { requestJson } from "./api-client";

export function checkHealth() {
  return requestJson<{ ok: boolean }>("/api/v1/health");
}
