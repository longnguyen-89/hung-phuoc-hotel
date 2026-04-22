import { TaskPriority } from "../types";

export function computePriority(dueBefore: Date, now: Date = new Date()): TaskPriority {
  const gapHours = (dueBefore.getTime() - now.getTime()) / 3_600_000;
  if (gapHours < 2) return "critical";
  if (gapHours < 4) return "high";
  if (gapHours < 8) return "normal";
  return "low";
}
