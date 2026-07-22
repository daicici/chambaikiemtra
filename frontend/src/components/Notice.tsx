import { AlertCircle, CheckCircle2, FileText } from "lucide-react";
import type { WorkState } from "../types";

export function Notice({ state, message }: { state: WorkState; message: string }) {
  return (
    <div className={`notice ${state === "error" ? "error" : state === "done" ? "success" : ""}`}>
      {state === "done" ? (
        <CheckCircle2 size={18} />
      ) : state === "error" ? (
        <AlertCircle size={18} />
      ) : (
        <FileText size={18} />
      )}
      <span>{message}</span>
    </div>
  );
}
