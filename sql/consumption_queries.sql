-- Consumption tracking SQL queries

-- Get all consumption items with their last consumption and overdue status
-- Similar to chores query but adapted for consumption tracking
SELECT 
    ci.id,
    ci.name,
    ci.interval_days,
    ci.created_at,
    ci.updated_at,
    ce.last_consumed_at,
    ce.last_quantity,
    -- Calculate if item is overdue based on interval
    CASE 
        WHEN ce.last_consumed_at IS NULL THEN 0  -- Never consumed, not overdue
        WHEN datetime('now') > datetime(ce.last_consumed_at, '+' || ci.interval_days || ' days') THEN 1
        ELSE 0
    END as is_overdue,
    -- Calculate next allowed consumption date
    CASE 
        WHEN ce.last_consumed_at IS NULL THEN datetime('now')
        ELSE datetime(ce.last_consumed_at, '+' || ci.interval_days || ' days')
    END as next_allowed_at
FROM consumption_items ci
LEFT JOIN (
    SELECT 
        consumption_item_id,
        MAX(consumed_at) as last_consumed_at,
        quantity as last_quantity
    FROM consumption_entries ce1
    WHERE consumed_at = (
        SELECT MAX(consumed_at) 
        FROM consumption_entries ce2 
        WHERE ce2.consumption_item_id = ce1.consumption_item_id
    )
    GROUP BY consumption_item_id
) ce ON ci.id = ce.consumption_item_id
ORDER BY ci.name;

-- Get only overdue consumption items
SELECT 
    ci.id,
    ci.name,
    ci.interval_days,
    ci.created_at,
    ci.updated_at,
    ce.last_consumed_at,
    ce.last_quantity,
    1 as is_overdue,
    datetime(ce.last_consumed_at, '+' || ci.interval_days || ' days') as next_allowed_at
FROM consumption_items ci
LEFT JOIN (
    SELECT 
        consumption_item_id,
        MAX(consumed_at) as last_consumed_at,
        quantity as last_quantity
    FROM consumption_entries ce1
    WHERE consumed_at = (
        SELECT MAX(consumed_at) 
        FROM consumption_entries ce2 
        WHERE ce2.consumption_item_id = ce1.consumption_item_id
    )
    GROUP BY consumption_item_id
) ce ON ci.id = ce.consumption_item_id
WHERE (
    ce.last_consumed_at IS NOT NULL 
    AND datetime('now') > datetime(ce.last_consumed_at, '+' || ci.interval_days || ' days')
)
ORDER BY ci.name;

-- Get consumption history for a specific item (limit N most recent)
-- :consumption_item_id - the item ID
-- :limit - number of entries to return
SELECT 
    id,
    consumption_item_id,
    consumed_at,
    quantity,
    notes,
    created_at,
    updated_at
FROM consumption_entries
WHERE consumption_item_id = :consumption_item_id
ORDER BY consumed_at DESC
LIMIT :limit;

-- Get all consumption history for a specific item
-- :consumption_item_id - the item ID
SELECT 
    id,
    consumption_item_id,
    consumed_at,
    quantity,
    notes,
    created_at,
    updated_at
FROM consumption_entries
WHERE consumption_item_id = :consumption_item_id
ORDER BY consumed_at DESC;

-- Insert new consumption entry
-- :id - unique ID for the entry
-- :consumption_item_id - the item that was consumed
-- :consumed_at - when it was consumed
-- :quantity - how much was consumed
-- :notes - optional notes
INSERT INTO consumption_entries (id, consumption_item_id, consumed_at, quantity, notes)
VALUES (:id, :consumption_item_id, :consumed_at, :quantity, :notes);

-- Update existing consumption entry
-- :id - the entry ID to update
-- :consumed_at - new consumption date
-- :quantity - new quantity
-- :notes - new notes
UPDATE consumption_entries 
SET 
    consumed_at = :consumed_at,
    quantity = :quantity,
    notes = :notes,
    updated_at = CURRENT_TIMESTAMP
WHERE id = :id;

-- Delete consumption entry
-- :id - the entry ID to delete
DELETE FROM consumption_entries WHERE id = :id;

-- Update consumption item interval
-- :id - the item ID
-- :interval_days - new interval in days
UPDATE consumption_items 
SET 
    interval_days = :interval_days,
    updated_at = CURRENT_TIMESTAMP
WHERE id = :id;

-- Get single consumption entry by ID
-- :id - the entry ID
SELECT 
    id,
    consumption_item_id,
    consumed_at,
    quantity,
    notes,
    created_at,
    updated_at
FROM consumption_entries
WHERE id = :id;

-- Get consumption statistics for an item
-- :consumption_item_id - the item ID
-- :days_back - how many days back to analyze (default 90)
SELECT 
    COUNT(*) as total_consumptions,
    AVG(quantity) as avg_quantity,
    SUM(quantity) as total_quantity,
    MIN(consumed_at) as first_consumption,
    MAX(consumed_at) as last_consumption,
    -- Calculate average days between consumptions
    CASE 
        WHEN COUNT(*) > 1 THEN
            CAST((julianday(MAX(consumed_at)) - julianday(MIN(consumed_at))) / (COUNT(*) - 1) AS INTEGER)
        ELSE NULL
    END as avg_days_between
FROM consumption_entries
WHERE consumption_item_id = :consumption_item_id
AND consumed_at >= datetime('now', '-' || COALESCE(:days_back, 90) || ' days');

-- Check if consumption is allowed (not within restriction period)
-- :consumption_item_id - the item ID
-- :proposed_date - the date you want to consume (default now)
SELECT 
    ci.name,
    ci.interval_days,
    ce.last_consumed_at,
    datetime(COALESCE(:proposed_date, datetime('now'))) as proposed_consumption_date,
    CASE 
        WHEN ce.last_consumed_at IS NULL THEN 1  -- Never consumed, allowed
        WHEN datetime(COALESCE(:proposed_date, datetime('now'))) >= datetime(ce.last_consumed_at, '+' || ci.interval_days || ' days') THEN 1
        ELSE 0
    END as is_allowed,
    CASE 
        WHEN ce.last_consumed_at IS NOT NULL THEN datetime(ce.last_consumed_at, '+' || ci.interval_days || ' days')
        ELSE NULL
    END as next_allowed_date
FROM consumption_items ci
LEFT JOIN (
    SELECT 
        consumption_item_id,
        MAX(consumed_at) as last_consumed_at
    FROM consumption_entries
    WHERE consumption_item_id = :consumption_item_id
    GROUP BY consumption_item_id
) ce ON ci.id = ce.consumption_item_id
WHERE ci.id = :consumption_item_id;