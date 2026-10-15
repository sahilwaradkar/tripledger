import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Group } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Firestore rejects undefined; omit optional fields instead of sending them. */
export function omitUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function groupAdminIds(group: Pick<Group, "adminIds" | "createdById">) {
  return group.adminIds?.length ? group.adminIds : [group.createdById];
}

export function generateInviteToken() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }
  return Math.random().toString(36).slice(2, 18);
}
