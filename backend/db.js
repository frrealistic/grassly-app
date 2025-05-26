const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
    } else {
        console.log('Connected to SQLite database');
        initDatabase();
    }
});

function initDatabase() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT,
                    email TEXT UNIQUE NOT NULL, 
                    password TEXT NOT NULL,
                    isadmin INTEGER DEFAULT 0, -- 0 = not admin, 1 = admin
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS fields (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    userId INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    location TEXT,
                    area REAL,
                    lat REAL,
                    lng REAL,
                    topLeftLat REAL,
                    topLeftLng REAL,
                    bottomRightLat REAL,
                    bottomRightLng REAL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS probes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    fieldId INTEGER NOT NULL,
                    lat REAL,
                    lng REAL,
                    description TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (fieldId) REFERENCES fields(id) ON DELETE CASCADE
                )`)
        db.run(`CREATE TABLE IF NOT EXISTS measurements (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    probeId INTEGER NOT NULL,
                    moisture REAL,
                    temperature REAL,
                    ec REAL,
                    measured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (probeId) REFERENCES probes(id) ON DELETE CASCADE
                )`)


    });
}

//slika u wordu za pojasnjenje Helper funkcija za upite (query)
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

module.exports = {
    db,
    query
}; 