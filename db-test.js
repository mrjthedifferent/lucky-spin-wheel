// Simple database test script
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Get absolute path to database
const dbPath = path.join(__dirname, 'lucky_wheel.db');

// Check if database file exists
console.log('Checking if database file exists at:', dbPath);
if (fs.existsSync(dbPath)) {
    console.log('✅ Database file exists!');
    
    // Check file size
    const stats = fs.statSync(dbPath);
    console.log(`Database file size: ${stats.size} bytes`);
} else {
    console.log('❌ Database file does not exist!');
}

// Try to open the database
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        process.exit(1);
    }
    
    console.log('✅ Successfully connected to database');
    
    // Check if users table exists
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
        if (err) {
            console.error('❌ Error checking for users table:', err.message);
            closeAndExit();
        }
        
        if (row) {
            console.log('✅ Users table exists');
            
            // Count users
            db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
                if (err) {
                    console.error('❌ Error counting users:', err.message);
                    closeAndExit();
                }
                
                console.log(`Found ${row.count} users in the database`);
                
                // Get all users
                db.all('SELECT * FROM users ORDER BY score DESC', (err, rows) => {
                    if (err) {
                        console.error('❌ Error retrieving users:', err.message);
                        closeAndExit();
                    }
                    
                    console.log('User data:');
                    if (rows.length === 0) {
                        console.log('No users found in the database.');
                    } else {
                        rows.forEach((row, i) => {
                            console.log(`[${i+1}] ID: ${row.id}, Name: ${row.name}, bKash: ${row.bkash_number}, Score: ${row.score}`);
                        });
                    }
                    
                    closeAndExit();
                });
            });
        } else {
            console.log('❌ Users table does not exist!');
            closeAndExit();
        }
    });
});

function closeAndExit() {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed');
        }
        process.exit(0);
    });
}
