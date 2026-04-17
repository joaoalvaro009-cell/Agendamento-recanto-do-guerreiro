import { addDays, format, isAfter, isBefore, startOfDay } from "date-fns";
import { MAX_DAYS_AHEAD, TIME_SLOTS } from "./constants";

/** Returns array of selectable Date objects (today + up to MAX_DAYS_AHEAD), excluding Sundays/Mondays. */
export function getAvailableDates(): Date[] {
  const today = startOfDay(new Date());
  const dates: Date[] = [];
  for (let i = 0; i <= MAX_DAYS_AHEAD; i++) {
    const d = addDays(today, i);
    const dow = d.getDay(); // 0 = Sun, 1 = Mon
    if (dow !== 0 && dow !== 1) dates.push(d);
  }
  return dates;
}

export function isDateSelectable(date: Date): boolean {
  const today = startOfDay(new Date());
  const max = addDays(today, MAX_DAYS_AHEAD);
  if (isBefore(date, today)) return false;
  if (isAfter(date, max)) return false;
  const dow = date.getDay();
  if (dow === 0 || dow === 1) return false;
  return true;
}

export function formatDateISO(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function formatDatePretty(date: Date): string {
  const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
}

/** Filter slots that already passed for today. */
export function getSlotsForDate(date: Date, takenTimes: string[]): { time: string; taken: boolean }[] {
  const now = new Date();
  const isToday = startOfDay(date).getTime() === startOfDay(now).getTime();
  return TIME_SLOTS.map((time) => {
    const [h, m] = time.split(":").map(Number);
    const slotDate = new Date(date);
    slotDate.setHours(h, m, 0, 0);
    const past = isToday && slotDate.getTime() <= now.getTime();
    const taken = takenTimes.includes(`${time}:00`) || takenTimes.includes(time);
    return { time, taken: taken || past };
  });
}
