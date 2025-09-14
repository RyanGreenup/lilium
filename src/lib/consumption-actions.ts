import { cache, action } from "@solidjs/router";
import { 
  getConsumptionItemsWithStatus,
  getOverdueConsumptionItems,
  createConsumptionEntry as dbCreateConsumptionEntry,
  updateConsumptionEntry as dbUpdateConsumptionEntry,
  deleteConsumptionEntry as dbDeleteConsumptionEntry,
  getConsumptionHistory as dbGetConsumptionHistory,
  getConsumptionStats as dbGetConsumptionStats,
  validateConsumption as dbValidateConsumption,
  updateConsumptionItemInterval as dbUpdateConsumptionItemInterval,
  seedConsumptionItemsIfEmpty as dbSeedConsumptionItemsIfEmpty
} from "./consumption-db";

////////////////////////////////////////////////////////////////////////////////
// Cache Functions /////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

export const loadConsumptionItems = cache(async () => {
  "use server";
  await dbSeedConsumptionItemsIfEmpty();
  return getConsumptionItemsWithStatus();
}, "consumption-items");

export const loadOverdueConsumptionItems = cache(async () => {
  "use server";
  await dbSeedConsumptionItemsIfEmpty();
  return getOverdueConsumptionItems();
}, "overdue-consumption-items");

export const getConsumptionHistory = cache(async (consumptionItemId: string, limit: number = 10) => {
  "use server";
  return dbGetConsumptionHistory(consumptionItemId, limit);
}, "consumption-history");

export const getConsumptionStats = cache(async (consumptionItemId: string, daysBack: number = 90) => {
  "use server";
  return dbGetConsumptionStats(consumptionItemId, daysBack);
}, "consumption-stats");

export const validateConsumption = cache(async (consumptionItemId: string, proposedDate?: string) => {
  "use server";
  return dbValidateConsumption(consumptionItemId, proposedDate);
}, "consumption-validation");

////////////////////////////////////////////////////////////////////////////////
// Action Functions ////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

export const createConsumptionAction = action(async (formData: FormData) => {
  "use server";
  const consumptionItemId = formData.get("consumptionItemId") as string;
  const consumedAt = formData.get("consumedAt") as string;
  const quantity = parseFloat(formData.get("quantity") as string) || 1.0;
  const notes = formData.get("notes") as string;

  // Convert date input (YYYY-MM-DD) to ISO datetime string
  const consumedAtISO = new Date(consumedAt + 'T00:00:00.000Z').toISOString();
  
  const result = await dbCreateConsumptionEntry(
    consumptionItemId, 
    consumedAtISO, 
    quantity, 
    notes || undefined
  );
  return result;
});

export const updateConsumptionAction = action(async (formData: FormData) => {
  "use server";
  const entryId = formData.get("entryId") as string;
  const consumedAt = formData.get("consumedAt") as string;
  const quantity = parseFloat(formData.get("quantity") as string) || 1.0;
  const notes = formData.get("notes") as string;

  // Convert date input (YYYY-MM-DD) to ISO datetime string
  const consumedAtISO = new Date(consumedAt + 'T00:00:00.000Z').toISOString();
  
  const result = await dbUpdateConsumptionEntry(
    entryId, 
    consumedAtISO, 
    quantity, 
    notes || undefined
  );
  return result;
});

export const deleteConsumptionAction = action(async (formData: FormData) => {
  "use server";
  const entryId = formData.get("entryId") as string;
  const result = await dbDeleteConsumptionEntry(entryId);
  return result;
});

export const updateConsumptionItemIntervalAction = action(async (formData: FormData) => {
  "use server";
  const consumptionItemId = formData.get("consumptionItemId") as string;
  const intervalDays = parseInt(formData.get("intervalDays") as string);
  const result = await dbUpdateConsumptionItemInterval(consumptionItemId, intervalDays);
  return result;
});