#!/usr/bin/env python3
"""
Database seeding script for Lilium notes application.
Populates the SQLite database with dummy notes, tags, and relationships.
"""

import sqlite3
import secrets
import datetime
import random
from pathlib import Path

# Database paths
NOTES_DB_PATH = "./.data/notes.sqlite"
USERS_DB_PATH = "./.data/users.sqlite"

# Sample data
SAMPLE_NOTES = [
    {
        "title": "Introduction to Machine Learning",
        "abstract": "Overview of machine learning concepts, algorithms, and applications in modern software development.",
        "content": """# Introduction to Machine Learning

Machine learning is a subset of artificial intelligence that enables computers to learn and improve from experience without being explicitly programmed.

## Key Concepts
- Supervised Learning
- Unsupervised Learning
- Reinforcement Learning

## Common Algorithms
1. Linear Regression
2. Decision Trees
3. Neural Networks
4. Support Vector Machines

## Applications
- Image Recognition
- Natural Language Processing
- Recommendation Systems
- Autonomous Vehicles
""",
        "syntax": "markdown",
        "parent_id": None
    },
    {
        "title": "Deep Learning Fundamentals",
        "abstract": "Comprehensive guide to neural networks, backpropagation, and deep learning architectures.",
        "content": """# Deep Learning Fundamentals

Deep learning is a subset of machine learning based on artificial neural networks with multiple layers.

## Neural Network Basics
- Perceptrons
- Activation Functions
- Forward Propagation
- Backpropagation

## Architectures
- Convolutional Neural Networks (CNNs)
- Recurrent Neural Networks (RNNs)
- Transformer Models

## Training Techniques
- Gradient Descent
- Batch Normalization
- Dropout
- Transfer Learning
""",
        "syntax": "markdown",
        "parent_id": None
    },
    {
        "title": "Computer Science",
        "abstract": "Root folder for computer science topics and research.",
        "content": """# Computer Science

This folder contains notes and research related to various computer science topics.

## Subdirectories
- Algorithms and Data Structures
- Software Engineering
- Machine Learning
- Database Systems
- Computer Networks
""",
        "syntax": "markdown",
        "parent_id": None
    },
    {
        "title": "Algorithms and Data Structures",
        "abstract": "Collection of notes on fundamental algorithms and data structures.",
        "content": """# Algorithms and Data Structures

Essential algorithms and data structures every programmer should know.

## Data Structures
- Arrays and Lists
- Stacks and Queues
- Trees and Graphs
- Hash Tables

## Algorithms
- Sorting Algorithms
- Search Algorithms
- Graph Algorithms
- Dynamic Programming
""",
        "syntax": "markdown",
        "parent_id": None
    },
    {
        "title": "Sorting Algorithms",
        "abstract": "Detailed analysis of various sorting algorithms including time and space complexity.",
        "content": """# Sorting Algorithms

## Bubble Sort
Time Complexity: O(n²)
Space Complexity: O(1)

```python
def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n-i-1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]
    return arr
```

## Quick Sort
Time Complexity: O(n log n) average, O(n²) worst
Space Complexity: O(log n)

## Merge Sort
Time Complexity: O(n log n)
Space Complexity: O(n)
""",
        "syntax": "markdown",
        "parent_id": None
    },
    {
        "title": "Binary Search Trees",
        "abstract": "Implementation and operations of binary search trees with examples.",
        "content": """# Binary Search Trees

A binary search tree is a hierarchical data structure where each node has at most two children.

## Properties
- Left subtree contains only nodes with keys lesser than the node's key
- Right subtree contains only nodes with keys greater than the node's key
- Both left and right subtrees are also binary search trees

## Operations
- Insert: O(log n) average, O(n) worst
- Search: O(log n) average, O(n) worst
- Delete: O(log n) average, O(n) worst

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class BST:
    def __init__(self):
        self.root = None
    
    def insert(self, val):
        # Implementation here
        pass
```
""",
        "syntax": "markdown",
        "parent_id": None
    },
    {
        "title": "Python Best Practices",
        "abstract": "Coding standards and best practices for Python development.",
        "content": """# Python Best Practices

## Code Style
- Follow PEP 8
- Use meaningful variable names
- Keep functions small and focused
- Use type hints

## Error Handling
```python
try:
    # risky operation
    result = divide(a, b)
except ZeroDivisionError:
    print("Cannot divide by zero")
except Exception as e:
    logger.error(f"Unexpected error: {e}")
```

## Documentation
- Use docstrings for functions and classes
- Keep comments concise and relevant
- Use README files for project documentation

## Testing
- Write unit tests
- Use pytest framework
- Aim for high test coverage
""",
        "syntax": "markdown",
        "parent_id": None
    },
    {
        "title": "Web Development Notes",
        "abstract": "Frontend and backend web development concepts and frameworks.",
        "content": """# Web Development

## Frontend Technologies
- HTML5
- CSS3
- JavaScript (ES6+)
- React/Vue/Angular
- TypeScript

## Backend Technologies
- Node.js
- Python (Django/Flask)
- Databases (SQL/NoSQL)
- REST APIs
- GraphQL

## DevOps
- Docker
- CI/CD
- Cloud Platforms
- Monitoring
""",
        "syntax": "markdown",
        "parent_id": None
    },
    {
        "title": "Database Design Principles",
        "abstract": "Fundamental principles of database design, normalization, and optimization.",
        "content": """# Database Design Principles

## Normalization
- First Normal Form (1NF)
- Second Normal Form (2NF)
- Third Normal Form (3NF)
- Boyce-Codd Normal Form (BCNF)

## ACID Properties
- **Atomicity**: All operations in a transaction succeed or fail together
- **Consistency**: Database remains in a valid state
- **Isolation**: Concurrent transactions don't interfere
- **Durability**: Committed transactions persist

## Indexing
- B-tree indexes
- Hash indexes
- Bitmap indexes
- Full-text indexes

## Query Optimization
- Use appropriate indexes
- Avoid SELECT *
- Use EXPLAIN to analyze queries
- Consider query execution plans
""",
        "syntax": "markdown",
        "parent_id": None
    },
    {
        "title": "Research Ideas",
        "abstract": "Collection of research ideas and potential projects.",
        "content": """# Research Ideas

## Current Interests
1. Federated Learning in Edge Computing
2. Quantum Machine Learning
3. Explainable AI
4. Privacy-Preserving Data Mining

## Potential Projects
- Distributed training frameworks
- Quantum algorithm implementations
- AI model interpretability tools
- Differential privacy mechanisms

## Reading List
- Papers on federated learning
- Quantum computing textbooks
- Privacy research publications
""",
        "syntax": "markdown",
        "parent_id": None
    }
]

SAMPLE_TAGS = [
    "machine-learning",
    "deep-learning",
    "algorithms",
    "data-structures",
    "python",
    "web-development",
    "database",
    "research",
    "computer-science",
    "programming",
    "ai",
    "neural-networks",
    "sorting",
    "trees",
    "best-practices",
    "backend",
    "frontend",
    "optimization",
    "security",
    "cloud"
]

def generate_id():
    """Generate a random hex ID like the TypeScript version."""
    return secrets.token_hex(16)

def get_users():
    """Get all user IDs from the users database."""
    try:
        conn = sqlite3.connect(USERS_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT id, username FROM users")
        users = cursor.fetchall()
        conn.close()
        return users
    except sqlite3.Error as e:
        print(f"Error reading users database: {e}")
        print(f"Make sure {USERS_DB_PATH} exists and has the correct schema.")
        return []

def create_database():
    """Create the database with the required schema."""
    conn = sqlite3.connect(NOTES_DB_PATH)
    cursor = conn.cursor()
    
    # Create tables (matching the TypeScript schema)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            abstract TEXT,
            content TEXT NOT NULL,
            syntax TEXT NOT NULL DEFAULT 'markdown',
            parent_id TEXT,
            user_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_id) REFERENCES notes(id) ON DELETE SET NULL
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tags (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            parent_id TEXT,
            user_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_id) REFERENCES tags(id) ON DELETE SET NULL,
            UNIQUE(title, user_id)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS note_tags (
            id TEXT PRIMARY KEY,
            note_id TEXT NOT NULL,
            tag_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
            UNIQUE(note_id, tag_id)
        )
    """)
    
    # Create the view
    cursor.execute("""
        CREATE VIEW IF NOT EXISTS note_child_counts AS
        SELECT 
            n.id,
            n.user_id,
            COALESCE(child_counts.child_count, 0) as child_count
        FROM notes n
        LEFT JOIN (
            SELECT 
                parent_id,
                COUNT(*) as child_count
            FROM notes 
            WHERE parent_id IS NOT NULL
            GROUP BY parent_id
        ) child_counts ON n.id = child_counts.parent_id;
    """)
    
    conn.commit()
    conn.close()

def seed_notes(user_id):
    """Insert sample notes into the database for a specific user."""
    conn = sqlite3.connect(NOTES_DB_PATH)
    cursor = conn.cursor()
    
    note_ids = []
    parent_notes = []
    
    # Insert notes
    for i, note_data in enumerate(SAMPLE_NOTES):
        note_id = generate_id()
        note_ids.append(note_id)
        
        # Vary the timestamps to simulate different creation times
        days_ago = random.randint(1, 30)
        created_at = datetime.datetime.now() - datetime.timedelta(days=days_ago)
        updated_at = created_at + datetime.timedelta(hours=random.randint(0, 48))
        
        cursor.execute("""
            INSERT INTO notes (id, title, abstract, content, syntax, parent_id, user_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            note_id,
            note_data["title"],
            note_data["abstract"],
            note_data["content"],
            note_data["syntax"],
            note_data["parent_id"],
            user_id,
            created_at.isoformat(),
            updated_at.isoformat()
        ))
        
        # Store potential parent notes (folders)
        if "folder" in note_data["title"].lower() or note_data["title"] in ["Computer Science", "Web Development Notes", "Research Ideas"]:
            parent_notes.append(note_id)
    
    # Create some hierarchical relationships
    if len(parent_notes) > 0 and len(note_ids) > len(parent_notes):
        cs_parent = None
        for i, note_id in enumerate(note_ids):
            cursor.execute("SELECT title FROM notes WHERE id = ?", (note_id,))
            title = cursor.fetchone()[0]
            
            if title == "Computer Science":
                cs_parent = note_id
                continue
            
            # Make some notes children of Computer Science folder
            if cs_parent and title in ["Introduction to Machine Learning", "Deep Learning Fundamentals", "Algorithms and Data Structures"]:
                cursor.execute("UPDATE notes SET parent_id = ? WHERE id = ?", (cs_parent, note_id))
            
            # Make sorting and BST children of Algorithms folder
            if title == "Algorithms and Data Structures":
                alg_parent = note_id
                for j, other_id in enumerate(note_ids):
                    cursor.execute("SELECT title FROM notes WHERE id = ?", (other_id,))
                    other_title = cursor.fetchone()[0]
                    if other_title in ["Sorting Algorithms", "Binary Search Trees"]:
                        cursor.execute("UPDATE notes SET parent_id = ? WHERE id = ?", (alg_parent, other_id))
    
    conn.commit()
    conn.close()
    return note_ids

def seed_tags(user_id):
    """Insert sample tags into the database for a specific user."""
    conn = sqlite3.connect(NOTES_DB_PATH)
    cursor = conn.cursor()
    
    tag_ids = []
    
    for tag_title in SAMPLE_TAGS:
        tag_id = generate_id()
        tag_ids.append(tag_id)
        
        try:
            cursor.execute("""
                INSERT INTO tags (id, title, user_id)
                VALUES (?, ?, ?)
            """, (tag_id, tag_title, user_id))
        except sqlite3.IntegrityError:
            # Tag already exists, skip
            continue
    
    conn.commit()
    conn.close()
    return tag_ids

def create_note_tag_relationships(note_ids, tag_ids, user_id):
    """Create relationships between notes and tags for a specific user."""
    conn = sqlite3.connect(NOTES_DB_PATH)
    cursor = conn.cursor()
    
    # Get actual tag IDs from database
    cursor.execute("SELECT id, title FROM tags WHERE user_id = ?", (user_id,))
    tags_map = {title: tag_id for tag_id, title in cursor.fetchall()}
    
    # Define which notes should have which tags
    note_tag_mapping = {
        "Introduction to Machine Learning": ["machine-learning", "ai", "computer-science"],
        "Deep Learning Fundamentals": ["deep-learning", "neural-networks", "ai", "machine-learning"],
        "Computer Science": ["computer-science", "programming"],
        "Algorithms and Data Structures": ["algorithms", "data-structures", "computer-science", "programming"],
        "Sorting Algorithms": ["algorithms", "sorting", "programming"],
        "Binary Search Trees": ["data-structures", "trees", "algorithms"],
        "Python Best Practices": ["python", "programming", "best-practices"],
        "Web Development Notes": ["web-development", "frontend", "backend", "programming"],
        "Database Design Principles": ["database", "optimization", "backend"],
        "Research Ideas": ["research", "ai", "machine-learning"]
    }
    
    for note_id in note_ids:
        cursor.execute("SELECT title FROM notes WHERE id = ?", (note_id,))
        note_title = cursor.fetchone()[0]
        
        if note_title in note_tag_mapping:
            for tag_title in note_tag_mapping[note_title]:
                if tag_title in tags_map:
                    relationship_id = generate_id()
                    try:
                        cursor.execute("""
                            INSERT INTO note_tags (id, note_id, tag_id)
                            VALUES (?, ?, ?)
                        """, (relationship_id, note_id, tags_map[tag_title]))
                    except sqlite3.IntegrityError:
                        # Relationship already exists, skip
                        continue
    
    conn.commit()
    conn.close()

def main():
    """Main function to seed the database."""
    print("Creating database and tables...")
    
    # Ensure data directory exists
    Path("./.data").mkdir(exist_ok=True)
    
    # Get users from the users database
    print("Reading users from users database...")
    users = get_users()
    
    if not users:
        print("No users found in the users database. Exiting.")
        return
    
    print(f"Found {len(users)} users:")
    for user_id, username in users:
        print(f"  - {username} ({user_id})")
    
    create_database()
    
    # Seed data for each user
    for user_id, username in users:
        print(f"\nSeeding data for user: {username} ({user_id})")
        
        print("  Seeding notes...")
        note_ids = seed_notes(user_id)
        print(f"  Created {len(note_ids)} notes")
        
        print("  Seeding tags...")
        tag_ids = seed_tags(user_id)
        print(f"  Created {len(tag_ids)} tags")
        
        print("  Creating note-tag relationships...")
        create_note_tag_relationships(note_ids, tag_ids, user_id)
        print("  Note-tag relationships created")
    
    print(f"\nDatabase seeding completed!")
    print(f"Notes database location: {NOTES_DB_PATH}")
    print(f"Users database location: {USERS_DB_PATH}")
    print(f"Seeded data for {len(users)} users")

if __name__ == "__main__":
    main()