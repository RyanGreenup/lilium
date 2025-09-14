import { cache, action } from "@solidjs/router";
import { 
  getChoresWithStatus, 
  getOverdueChores,
  completeChore as dbCompleteChore, 
  undoLastCompletion as dbUndoLastCompletion, 
  updateChoreDuration as dbUpdateChoreDuration, 
  getChoreCompletions as dbGetChoreCompletions,
  seedChoresIfEmpty as dbSeedChoresIfEmpty
} from "./db";

export const loadChores = cache(async () => {
  "use server";
  await dbSeedChoresIfEmpty();
  return getChoresWithStatus();
}, "chores");

export const loadOverdueChores = cache(async () => {
  "use server";
  await dbSeedChoresIfEmpty();
  return getOverdueChores();
}, "overdue-chores");

export const getCompletions = cache(async (choreId: string, limit: number = 10) => {
  "use server";
  return dbGetChoreCompletions(choreId, limit);
}, "completions");

export const completeChoreAction = action(async (formData: FormData) => {
  "use server";
  const choreId = formData.get("choreId") as string;
  const notes = formData.get("notes") as string;
  const result = await dbCompleteChore(choreId, notes || undefined);
  return result;
});

export const undoChoreAction = action(async (formData: FormData) => {
  "use server";
  const choreId = formData.get("choreId") as string;
  const result = await dbUndoLastCompletion(choreId);
  return result;
});

export const updateDurationAction = action(async (formData: FormData) => {
  "use server";
  const choreId = formData.get("choreId") as string;
  const durationHours = parseInt(formData.get("durationHours") as string);
  const result = await dbUpdateChoreDuration(choreId, durationHours);
  return result;
});