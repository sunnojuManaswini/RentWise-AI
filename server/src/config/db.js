const mysql = require('mysql2/promise');
const sqlite3 = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

let dbType = 'MYSQL';
let mysqlPool = null;
let sqliteDb = null;

async function initDatabase() {
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || 3306;
    const dbUser = process.env.DB_USER || 'root';
    const dbPassword = process.env.DB_PASSWORD || '';
    const dbName = process.env.DB_NAME || 'rentwise_db';
    const dbSsl = process.env.DB_SSL === 'true';

    try {
        console.log(`[RentWise DB] Attempting MySQL connection to ${dbHost}:${dbPort}/${dbName}...`);
        
        // Initial connection without database to create if not exists
        const rootConn = await mysql.createConnection({
            host: dbHost,
            port: Number(dbPort),
            user: dbUser,
            password: dbPassword,
            ssl: dbSsl ? { rejectUnauthorized: false } : undefined
        });

        await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
        await rootConn.end();

        // Create connection pool to target database
        mysqlPool = mysql.createPool({
            host: dbHost,
            port: Number(dbPort),
            user: dbUser,
            password: dbPassword,
            database: dbName,
            ssl: dbSsl ? { rejectUnauthorized: false } : undefined,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        // Test connection
        const conn = await mysqlPool.getConnection();
        console.log('✅ [RentWise DB] MySQL Connected Successfully!');
        conn.release();

        // Run schema & seed setup
        await setupMySQLTables();
        dbType = 'MYSQL';
    } catch (err) {
        console.warn('⚠️ [RentWise DB] MySQL Connection failed or credentials invalid:', err.message);
        console.log('🔄 [RentWise DB] Switching to built-in SQLite database engine for zero-config fallback execution.');
        
        const dbPath = path.join(__dirname, '../../rentwise_fallback.sqlite');
        sqliteDb = new sqlite3(dbPath);
        dbType = 'SQLITE';
        setupSQLiteTables();
    }
}

async function setupMySQLTables() {
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const seedPath = path.join(__dirname, '../database/seed.sql');

    if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        const statements = schemaSql.split(';').filter(stmt => stmt.trim().length > 0);
        for (const stmt of statements) {
            await mysqlPool.query(stmt);
        }
        console.log('✅ [RentWise DB] MySQL Schema tables verified/created.');
    }

    // Check if users table is empty to seed initial data
    const [users] = await mysqlPool.query('SELECT COUNT(*) as count FROM users');
    if (users[0].count === 0 && fs.existsSync(seedPath)) {
        console.log('🌱 [RentWise DB] Seeding initial test data into MySQL...');
        const seedSql = fs.readFileSync(seedPath, 'utf8');
        const statements = seedSql.split(';').filter(stmt => stmt.trim().length > 0);
        for (const stmt of statements) {
            try {
                await mysqlPool.query(stmt);
            } catch (sErr) {
                // Ignore duplicate seeds
            }
        }
        console.log('✅ [RentWise DB] Seed data populated.');
    }
}

function setupSQLiteTables() {
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const seedPath = path.join(__dirname, '../database/seed.sql');

    if (fs.existsSync(schemaPath)) {
        let schemaSql = fs.readFileSync(schemaPath, 'utf8');
        // Convert MySQL schema to SQLite compatible
        schemaSql = schemaSql
            .replace(/VARCHAR\(\d+\)/gi, 'TEXT')
            .replace(/ENUM\([^)]+\)/gi, 'TEXT')
            .replace(/DECIMAL\(\d+,\s*\d+\)/gi, 'NUMERIC')
            .replace(/BOOLEAN/gi, 'INTEGER')
            .replace(/TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP/gi, 'DATETIME DEFAULT CURRENT_TIMESTAMP')
            .replace(/TIMESTAMP DEFAULT CURRENT_TIMESTAMP/gi, 'DATETIME DEFAULT CURRENT_TIMESTAMP')
            .replace(/INT\s+AUTO_INCREMENT/gi, 'INTEGER')
            .replace(/AUTO_INCREMENT/gi, '')
            .replace(/\bTRUE\b/gi, '1')
            .replace(/\bFALSE\b/gi, '0')
            .replace(/ON DELETE CASCADE/gi, '')
            .replace(/ON DELETE SET NULL/gi, '');

        const statements = schemaSql.split(';').filter(stmt => stmt.trim().length > 0);
        for (const stmt of statements) {
            try {
                sqliteDb.exec(stmt);
            } catch (e) {
                // Ignore duplicate table / constraint errors silently
            }
        }
        console.log('✅ [RentWise DB] SQLite Schema tables verified/created.');
    }

    const row = sqliteDb.prepare('SELECT count(*) as count FROM users').get();
    if (row.count === 0 && fs.existsSync(seedPath)) {
        let seedSql = fs.readFileSync(seedPath, 'utf8');
        // Convert MySQL-specific seed syntax to SQLite
        seedSql = seedSql
            .replace(/INSERT IGNORE INTO/gi, 'INSERT OR IGNORE INTO')
            .replace(/\bTRUE\b/gi, '1')
            .replace(/\bFALSE\b/gi, '0');
        const statements = seedSql.split(';').filter(stmt => stmt.trim().length > 0);
        for (const stmt of statements) {
            try {
                sqliteDb.exec(stmt);
            } catch (e) {
                console.warn('[SQLite Seed] Skipped statement:', e.message.slice(0, 80));
            }
        }
        console.log('✅ [RentWise DB] SQLite Fallback Seeded with demo data.');
    }
}

async function query(sql, params = []) {
    if (dbType === 'MYSQL') {
        const [rows] = await mysqlPool.execute(sql, params);
        return rows;
    } else {
        // SQLite query — better-sqlite3 requires spread args, NOT array
        const stmt = sqliteDb.prepare(sql);
        const upperTrimmed = sql.trim().toUpperCase();
        if (upperTrimmed.startsWith('SELECT') || upperTrimmed.startsWith('WITH')) {
            return stmt.all(...params);
        } else {
            const result = stmt.run(...params);
            return { affectedRows: result.changes, insertId: result.lastInsertRowid };
        }
    }
}

module.exports = {
    initDatabase,
    query,
    getDbType: () => dbType
};
