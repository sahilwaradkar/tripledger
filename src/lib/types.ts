export const EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Stay",
  "Activities",
  "Shopping",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type ParticipantKind = "member" | "guest";

export interface UserProfile {
  email: string;
  displayName: string;
}

export interface Trip {
  id: string;
  ownerId: string;
  name: string;
  startDate?: string;
  endDate?: string;
}

export interface PersonalExpense {
  id: string;
  ownerId: string;
  tripId?: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  date: string;
  note?: string;
  updatedAt: number;
}

export interface Group {
  id: string;
  name: string;
  currency: string;
  startDate?: string;
  endDate?: string;
  createdById: string;
  memberIds: string[];
  adminIds: string[];
  inviteToken: string;
}

export interface Participant {
  id: string;
  displayName: string;
  email?: string;
  userId?: string;
  kind: ParticipantKind;
  claimedByUserId?: string;
}

export interface ExpenseSplit {
  participantId: string;
  amount: number;
}

export interface GroupExpense {
  id: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  date: string;
  note?: string;
  paidByParticipantId: string;
  splits: ExpenseSplit[];
  updatedAt: number;
}

export interface Invite {
  token: string;
  groupId: string;
  createdById: string;
}

export type SyncStatus = "offline" | "syncing" | "synced";
