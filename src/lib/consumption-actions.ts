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
  // Use noon UTC to avoid timezone edge cases while preserving the intended date
  const consumedAtISO = new Date(consumedAt + 'T12:00:00.000Z').toISOString();
  
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
  // Use noon UTC to avoid timezone edge cases while preserving the intended date
  const consumedAtISO = new Date(consumedAt + 'T12:00:00.000Z').toISOString();
  
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

////////////////////////////////////////////////////////////////////////////////
// Report Analytics ////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

export const loadConsumptionAnalytics = cache(async () => {
  "use server";
  const items = await getConsumptionItemsWithStatus();
  
  const analytics = await Promise.all(
    items.map(async (item) => {
      const stats = await dbGetConsumptionStats(item.id, 90);
      return {
        ...item,
        ...stats,
        // Calculate days until next allowed consumption
        days_until_next: item.last_consumed_at 
          ? Math.max(0, Math.ceil((new Date(item.next_allowed_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : 0,
        // Calculate consumption frequency (consumptions per month)
        consumption_frequency: stats.total_consumptions > 0 && stats.avg_days_between 
          ? Math.round((30 / stats.avg_days_between) * 10) / 10 
          : 0,
      };
    })
  );
  
  return analytics;
}, "consumption-analytics");

export const loadConsumptionSummary = cache(async () => {
  "use server";
  const items = await getConsumptionItemsWithStatus();
  const totalItems = items.length;
  const overdueItems = items.filter(item => item.is_overdue).length;
  const onTimeItems = totalItems - overdueItems;
  
  // Get total consumptions this week across all items
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  let consumptionsThisWeek = 0;
  for (const item of items) {
    const history = await dbGetConsumptionHistory(item.id, 50);
    consumptionsThisWeek += history.filter(entry => 
      new Date(entry.consumed_at) >= oneWeekAgo
    ).length;
  }
  
  return {
    total_items: totalItems,
    overdue_items: overdueItems,
    on_time_items: onTimeItems,
    consumptions_this_week: consumptionsThisWeek,
  };
}, "consumption-summary");