-- Consumption tracking tables following the chores pattern

-- Main consumption items table (the foods you need to track)
CREATE TABLE consumption_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    interval_days INTEGER NOT NULL, -- Days between allowed consumptions
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Individual consumption entries (when you actually consumed something)
CREATE TABLE consumption_entries (
    id TEXT PRIMARY KEY,
    consumption_item_id TEXT NOT NULL,
    consumed_at DATETIME NOT NULL, -- When the consumption occurred
    quantity REAL NOT NULL DEFAULT 1.0, -- Amount consumed
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (consumption_item_id) REFERENCES consumption_items(id) ON DELETE CASCADE
);

-- Index for faster queries on consumption lookups
CREATE INDEX idx_consumption_entries_item_date ON consumption_entries(consumption_item_id, consumed_at DESC);
CREATE INDEX idx_consumption_entries_consumed_at ON consumption_entries(consumed_at DESC);

-- Insert the initial medical dietary restriction items
INSERT INTO consumption_items (id, name, interval_days) VALUES
    ('lemons', 'Lemons', 30),
    ('meat', 'Meat', 90),
    ('candy', 'Candy', 14),
    ('kale', 'Kale', 14),
    ('turmeric', 'Turmeric', 14);