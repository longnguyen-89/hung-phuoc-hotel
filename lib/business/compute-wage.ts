import { CleaningTask } from "../types";

export type WageInput = {
  task: CleaningTask;
  hourlyRate: number;
  weekendMultiplier: number;
  holidayMultiplier: number;
  holidays?: string[];
};

export type WageResult = {
  baseHours: number;
  baseRate: number;
  baseAmount: number;
  bonusAmount: number;
  bonusReason: string;
  penaltyAmount: number;
  penaltyReason: string;
  totalAmount: number;
};

const HEAVY_DIRTY_BONUS = 20000;
const NIGHT_SHIFT_BONUS = 15000;
const LATE_PENALTY_PER_HOUR = 30000;

export function computeWage(input: WageInput): WageResult {
  const { task, hourlyRate, weekendMultiplier, holidayMultiplier, holidays = [] } = input;

  if (!task.started_at || !task.completed_at) {
    throw new Error("Task chưa có started_at hoặc completed_at");
  }

  const startedAt = new Date(task.started_at);
  const completedAt = new Date(task.completed_at);
  const dueBefore = new Date(task.due_before);

  const durationMs = completedAt.getTime() - startedAt.getTime();
  const baseHours = Math.round((durationMs / 3_600_000) * 100) / 100;

  // Multiplier theo ngày
  let multiplier = 1;
  const day = startedAt.getDay();
  if (day === 0 || day === 6) multiplier = weekendMultiplier;
  const ymd = startedAt.toISOString().slice(0, 10);
  if (holidays.includes(ymd)) multiplier = holidayMultiplier;

  const baseRate = hourlyRate;
  const baseAmount = Math.round(baseHours * baseRate * multiplier);

  // Bonus
  let bonus = 0;
  const bonusReasons: string[] = [];
  if (task.dirty_level === "heavy") {
    bonus += HEAVY_DIRTY_BONUS;
    bonusReasons.push(`Phòng bẩn nặng (+${HEAVY_DIRTY_BONUS.toLocaleString("vi-VN")}đ)`);
  }
  const hour = startedAt.getHours();
  if (hour >= 22 || hour < 6) {
    bonus += NIGHT_SHIFT_BONUS;
    bonusReasons.push(`Làm đêm (+${NIGHT_SHIFT_BONUS.toLocaleString("vi-VN")}đ)`);
  }

  // Penalty: trễ deadline
  let penalty = 0;
  const penaltyReasons: string[] = [];
  if (completedAt > dueBefore) {
    const lateHours = (completedAt.getTime() - dueBefore.getTime()) / 3_600_000;
    penalty = Math.round(lateHours * LATE_PENALTY_PER_HOUR);
    penaltyReasons.push(`Trễ ${lateHours.toFixed(1)}h (-${penalty.toLocaleString("vi-VN")}đ)`);
  }

  return {
    baseHours,
    baseRate,
    baseAmount,
    bonusAmount: bonus,
    bonusReason: bonusReasons.join("; "),
    penaltyAmount: penalty,
    penaltyReason: penaltyReasons.join("; "),
    totalAmount: baseAmount + bonus - penalty,
  };
}
