#!/usr/bin/env python3
"""
Script to populate the chores database with hundreds of test completions
Run this from the project root: python3 populate_test_data.py
"""

import sqlite3
import random
import secrets
from datetime import datetime, timedelta

def generate_id():
    """Generate a random 16-byte hex ID like the Node.js randomBytes(16).toString('hex')"""
    return secrets.token_hex(16)

def main():
    # Connect to database
    conn = sqlite3.connect('./.data/app.sqlite')
    cursor = conn.cursor()
    
    # Sample chores data
    sample_chores = [
        {"name": "Take Out Trash", "duration_hours": 12},
        {"name": "Start Washing Machine", "duration_hours": 4},
        {"name": "Load Dryer", "duration_hours": 4},
        {"name": "Fold Clothes", "duration_hours": 4},
        {"name": "Clean Kitchen", "duration_hours": 5},
        {"name": "Water Plants", "duration_hours": 48},
        {"name": "Load Dishwasher", "duration_hours": 6},
        {"name": "Empty Dishes", "duration_hours": 6},
        {"name": "Change Zel's Toilet", "duration_hours": 24 * 3},
        {"name": "Vacuum", "duration_hours": 24},
        {"name": "Mop", "duration_hours": 48},
        {"name": "Clean Toilet", "duration_hours": 24},
        {"name": "Clean Oven", "duration_hours": 72},
        {"name": "Clear Filters", "duration_hours": 72},
        {"name": "Update NAS", "duration_hours": 72},
        {"name": "Clean Windows", "duration_hours": 24},
        {"name": "Walk the dog", "duration_hours": 12},
    ]
    
    # Sample markdown notes (30% chance of having notes)
    sample_notes = [
        "Quick clean today",
        "# Deep Clean Session\n- **Duration**: 45 minutes\n- *Found issues*: None\n\n> Next time: Focus on corners",
        "Standard maintenance completed",
        "**Issues found:**\n- Minor leak fixed\n- Filter replaced\n\n*Time taken*: 30 mins",
        "Routine weekly clean\n\n`Status`: ✅ Complete", 
        "Monthly deep clean with extra attention to problem areas",
        "## Maintenance Log\n1. Checked filters\n2. Cleaned surfaces\n3. Restocked supplies\n\n> **Note**: Everything in good condition",
        "Quick 15-minute session",
        "Extended cleaning due to neglect",
        "# Today's Tasks\n- [x] Main area\n- [x] Problem spots\n- [ ] Deep clean next time\n\n*Rating*: 8/10"
    ]
    
    processed_chores = []
    
    # Create/get chores
    for chore in sample_chores:
        try:
            chore_id = generate_id()
            cursor.execute(
                "INSERT INTO chores (id, name, duration_hours) VALUES (?, ?, ?)",
                (chore_id, chore["name"], chore["duration_hours"])
            )
            processed_chores.append({
                "id": chore_id,
                "name": chore["name"], 
                "duration_hours": chore["duration_hours"]
            })
            print(f"Created chore: {chore['name']}")
        except sqlite3.IntegrityError:
            # Chore already exists, get it
            cursor.execute("SELECT id, name, duration_hours FROM chores WHERE name = ?", (chore["name"],))
            existing = cursor.fetchone()
            if existing:
                processed_chores.append({
                    "id": existing[0],
                    "name": existing[1],
                    "duration_hours": existing[2]
                })
                print(f"Found existing chore: {chore['name']}")
    
    # Generate completions over the past 90 days
    now = datetime.now()
    days_back = 90
    total_completions = 0
    
    for chore in processed_chores:
        expected_completions_per_day = 24 / chore["duration_hours"]
        total_expected = int(expected_completions_per_day * days_back * (0.7 + random.random() * 0.6))
        
        print(f"Generating {total_expected} completions for {chore['name']}")
        
        for i in range(total_expected):
            # Random completion time within past 90 days
            random_days_ago = random.random() * days_back
            completion_time = now - timedelta(days=random_days_ago)
            
            # 30% chance of having notes
            notes = None
            if random.random() < 0.3:
                notes = random.choice(sample_notes)
            
            completion_id = generate_id()
            
            # Format timestamp as SQLite expects (YYYY-MM-DD HH:MM:SS)
            timestamp_str = completion_time.strftime('%Y-%m-%d %H:%M:%S')
            
            cursor.execute(
                "INSERT INTO chore_completions (id, chore_id, completed_at, notes) VALUES (?, ?, ?, ?)",
                (completion_id, chore["id"], timestamp_str, notes)
            )
            
            total_completions += 1
    
    # Commit all changes
    conn.commit()
    conn.close()
    
    print(f"\n✅ SUCCESS!")
    print(f"Generated {total_completions} completions for {len(processed_chores)} chores over {days_back} days")
    print(f"Database populated with realistic test data including markdown notes!")

if __name__ == "__main__":
    main()