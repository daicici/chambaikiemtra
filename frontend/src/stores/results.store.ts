import type { GradingResult } from "@/types/grading-result";

const STORAGE_KEY = "omr.results";

export function loadResults(): GradingResult[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as GradingResult[]) : [];
}

export function saveResults(results: GradingResult[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
}

export function clearResults() {
  localStorage.removeItem(STORAGE_KEY);
}
