import { format, formatDistanceToNowStrict } from "date-fns";

export function fmtDate(ts: number | undefined | null): string {
  if (!ts) return "—";
  return format(new Date(ts), "d MMM yyyy");
}

export function fmtDateTime(ts: number): string {
  return format(new Date(ts), "d MMM yyyy · HH:mm");
}

export function fmtDateInput(ts: number): string {
  return format(new Date(ts), "yyyy-MM-dd");
}

export function relativeTime(ts: number): string {
  return formatDistanceToNowStrict(new Date(ts), { addSuffix: true });
}

export function daysInStage(enteredAt: number): number {
  return Math.max(0, Math.floor((Date.now() - enteredAt) / 86_400_000));
}

export function money(n: number, currency: string): string {
  return `${currency} ${n.toLocaleString("en-US")}`;
}

export function initials(name: string | undefined | null): string {
  return (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
