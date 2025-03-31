const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Set to true for production to disable verbose logging
const PRODUCTION_MODE = process.env.NODE_ENV === 'production' || true;

// Simple logger for production toggle
const logger = {
    log: function (message, ...args) {
        if (!PRODUCTION_MODE) {
            console.log(message, ...args);
        }
    },
    error: function (message, ...args) {
        // Always log errors even in production
        console.error(message, ...args);
    },
    warn: function (message, ...args) {
        if (!PRODUCTION_MODE) {
            console.warn(message, ...args);
        }
    }
};

// Function to encrypt bKash number
function encryptBkashNumber(bkashNumber) {
    // Keep first two digits (e.g., '01') and last two digits visible, mask the rest with asterisks
    if (bkashNumber && bkashNumber.length >= 4) {
        const firstTwoDigits = bkashNumber.substring(0, 2);
        const lastTwoDigits = bkashNumber.substring(bkashNumber.length - 2);
        const maskedPart = '*'.repeat(bkashNumber.length - 4);
        return `${firstTwoDigits}${maskedPart}${lastTwoDigits}`;
    }
    return bkashNumber;
}

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/')));

// Ensure database directory exists
const fs = require('fs');
const dbDir = path.join(__dirname);
const dbPath = path.join(dbDir, 'lucky_wheel.db');

// Check if database file exists
const dbExists = fs.existsSync(dbPath);
if (!dbExists) {
    logger.log('Database file does not exist yet, will be created');
} else {
    logger.log('Database file found at:', dbPath);
}

// Initialize SQLite database with absolute path
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        logger.error('Error connecting to database:', err.message);
    } else {
        logger.log('Connected to SQLite database at:', dbPath);

        // Create users table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            bkash_number TEXT NOT NULL UNIQUE,
            score INTEGER DEFAULT 0,
            has_played BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(bkash_number)
        )`, (err) => {
            if (err) {
                logger.error('Error creating table:', err.message);
            } else {
                logger.log('Users table ready');

                // Check if we have any existing users
                db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
                    if (err) {
                        logger.error('Error counting users:', err.message);
                    } else {
                        logger.log('Current users in database:', row.count);
                    }
                });
            }
        });
    }
});

// API Routes

// Validate user (check if bKash number exists)
app.post('/api/validate-user', (req, res) => {
    const { bkashNumber } = req.body;

    if (!bkashNumber || bkashNumber.trim() === '') {
        return res.status(400).json({ valid: false, message: 'bKash number is required' });
    }

    db.get('SELECT * FROM users WHERE bkash_number = ?', [bkashNumber], (err, row) => {
        if (err) {
            return res.status(500).json({ valid: false, message: 'Database error' });
        }

        if (row) {
            // bKash number already exists
            logger.log(`Existing user found: ${row.name}, has_played: ${row.has_played}`);
            return res.json({
                valid: false,
                message: 'This bKash number is already registered',
                user: {
                    id: row.id,
                    name: row.name,
                    bkashNumber: row.bkash_number,
                    encryptedBkashNumber: encryptBkashNumber(row.bkash_number),
                    hasPlayed: row.has_played === 1,
                    score: row.score
                }
            });
        } else {
            // bKash number is available
            return res.json({ valid: true, message: 'bKash number is available' });
        }
    });
});

// Add new user
app.post('/api/users', (req, res) => {
    const { name, bkashNumber } = req.body;

    if (!name || !bkashNumber || name.trim() === '' || bkashNumber.trim() === '') {
        return res.status(400).json({ success: false, message: 'Name and bKash number are required' });
    }

    // Check if bKash number already exists
    db.get('SELECT * FROM users WHERE bkash_number = ?', [bkashNumber], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (row) {
            return res.status(400).json({ success: false, message: 'This bKash number is already registered' });
        }

        // Insert new user
        db.run('INSERT INTO users (name, bkash_number) VALUES (?, ?)', [name, bkashNumber], function (err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Failed to register user' });
            }

            return res.json({
                success: true,
                message: 'User registered successfully',
                user: {
                    id: this.lastID,
                    name,
                    bkashNumber,
                    encryptedBkashNumber: encryptBkashNumber(bkashNumber)
                }
            });
        });
    });
});

// Update user score and mark as played
app.put('/api/users/:id/score', (req, res) => {
    const { id } = req.params;
    const { score } = req.body;

    if (isNaN(score)) {
        return res.status(400).json({ success: false, message: 'Valid score is required' });
    }

    db.run('UPDATE users SET score = ?, has_played = 1 WHERE id = ?', [score, id], function (err) {
        if (err) {
            logger.error('Error updating user score:', err);
            return res.status(500).json({ success: false, message: 'Failed to update score' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        logger.log(`User ${id} score updated to ${score} and marked as played`);
        return res.json({ success: true, message: 'Score updated successfully' });
    });
});

// Get top winners
app.get('/api/winners', (req, res) => {
    db.all('SELECT * FROM users ORDER BY score DESC LIMIT 3', (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to get winners' });
        }

        const winners = rows.map(row => ({
            id: row.id,
            name: row.name,
            bkashNumber: row.bkash_number,
            encryptedBkashNumber: encryptBkashNumber(row.bkash_number),
            score: row.score
        }));

        return res.json({ success: true, winners });
    });
});

// Get all users with scores
app.get('/api/users', (req, res) => {
    logger.log('GET /api/users - Fetching all users');

    // Always get all users ordered by score (highest first)
    db.all('SELECT * FROM users ORDER BY score DESC', (err, rows) => {
        if (err) {
            logger.error('Database error when fetching users:', err.message);
            return res.status(500).json({ success: false, message: 'Failed to get users' });
        }

        logger.log('Database returned', rows.length, 'users');

        const users = rows.map(row => ({
            id: row.id,
            name: row.name,
            bkashNumber: row.bkash_number,
            encryptedBkashNumber: encryptBkashNumber(row.bkash_number),
            score: row.score,
            hasPlayed: row.has_played === 1 // Use the actual value from database
        }));

        logger.log('User play status from database:', users.map(u => `${u.name}: ${u.hasPlayed ? 'has played' : 'has not played'}`));

        logger.log('Sending response with', users.length, 'users');
        return res.json({ success: true, users });
    });
});

// Update user name
app.put('/api/users/:id/name', (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    logger.log(`PUT /api/users/${id}/name - Updating user name to "${name}"`);

    if (!name || name.trim() === '') {
        logger.error('Invalid name provided');
        return res.status(400).json({ success: false, message: 'Valid name is required' });
    }

    db.run('UPDATE users SET name = ? WHERE id = ?', [name, id], function (err) {
        if (err) {
            logger.error('Error updating user name:', err);
            return res.status(500).json({ success: false, message: 'Failed to update name' });
        }

        if (this.changes === 0) {
            logger.error(`User with ID ${id} not found`);
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        logger.log(`User ${id} name updated to "${name}"`);
        return res.json({
            success: true,
            message: 'Name updated successfully',
            user: { id, name }
        });
    });
});

// Generic user update endpoint (fallback for compatibility)
app.put('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    logger.log(`PUT /api/users/${id} - Generic update, setting name to "${name}"`);

    if (!name || name.trim() === '') {
        logger.error('Invalid name provided to generic update');
        return res.status(400).json({ success: false, message: 'Valid name is required' });
    }

    db.run('UPDATE users SET name = ? WHERE id = ?', [name, id], function (err) {
        if (err) {
            logger.error('Error in generic user update:', err);
            return res.status(500).json({ success: false, message: 'Failed to update user' });
        }

        if (this.changes === 0) {
            logger.error(`User with ID ${id} not found in generic update`);
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        logger.log(`User ${id} updated via generic endpoint`);
        return res.json({
            success: true,
            message: 'User updated successfully',
            user: { id, name }
        });
    });
});

// Start server
app.listen(PORT, () => {
    logger.log(`Server running on port ${PORT}`);
});
