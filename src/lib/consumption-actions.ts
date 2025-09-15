import { cache, action, query } from "@solidjs/router";
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

export const loadConsumptionItems = query(async () => {
  "use server";
  await dbSeedConsumptionItemsIfEmpty();
  return getConsumptionItemsWithStatus();
}, "consumption-items");

export const loadOverdueConsumptionItems = query(async () => {
  "use server";
  await dbSeedConsumptionItemsIfEmpty();
  return getOverdueConsumptionItems();
}, "overdue-consumption-items");

export const getConsumptionHistory = query(async (consumptionItemId: string, limit: number = 10) => {
  "use server";
  return dbGetConsumptionHistory(consumptionItemId, limit);
}, "consumption-history");

export const getConsumptionStats = query(async (consumptionItemId: string, daysBack: number = 90) => {
  "use server";
  return dbGetConsumptionStats(consumptionItemId, daysBack);
}, "consumption-stats");

export const validateConsumption = query(async (consumptionItemId: string, proposedDate?: string) => {
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
      const history = await dbGetConsumptionHistory(item.id, 1000);
      
      // Get unique users who have consumed this item
      const uniqueUsers = [...new Set(history.map(entry => entry.username || 'unknown'))];
      
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
        // Add user information
        unique_users: uniqueUsers,
        user_count: uniqueUsers.length,
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

export const loadAllConsumptionEntries = cache(async () => {
  "use server";
  const items = await getConsumptionItemsWithStatus();

  const allEntries = [];
  for (const item of items) {
    const entries = await dbGetConsumptionHistory(item.id, 1000); // Get all entries
    for (const entry of entries) {
      allEntries.push({
        ...entry,
        food_name: item.name,
        interval_days: item.interval_days,
        is_currently_overdue: item.is_overdue,
        next_allowed_at: item.next_allowed_at,
        // Username should always be present in new schema, but fallback for safety
        username: entry.username || 'unknown',
      });
    }
  }

  // Sort by consumed_at descending (most recent first)
  allEntries.sort((a, b) => new Date(b.consumed_at).getTime() - new Date(a.consumed_at).getTime());

  return allEntries;
}, "all-consumption-entries");
