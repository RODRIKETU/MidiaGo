const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
};

const DB_NAME = process.env.DB_NAME || 'midiago';

async function initDB() {
    let connection;
    try {
        console.log(`Connecting to MySQL at ${dbConfig.host}...`);
        connection = await mysql.createConnection(dbConfig);

        console.log(`Creating database ${DB_NAME} if not exists...`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
        
        console.log(`Using database ${DB_NAME}...`);
        await connection.query(`USE \`${DB_NAME}\``);

        console.log(`Creating users table...`);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role ENUM('usuario', 'superadmin') DEFAULT 'usuario',
                personal_token VARCHAR(255) UNIQUE NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        console.log(`Creating media table...`);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS media (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                filename VARCHAR(255) NOT NULL,
                original_name VARCHAR(255) NOT NULL,
                cover_filename VARCHAR(255) NULL,
                mimetype VARCHAR(100) NOT NULL,
                size BIGINT NOT NULL,
                status ENUM('public', 'private') DEFAULT 'private',
                uploaded_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        console.log(`Checking for default users...`);
        const [users] = await connection.query('SELECT * FROM users WHERE username IN (?, ?)', ['usuario', 'superadmin']);
        
        const existingUsers = users.map(u => u.username);
        const hashedPassword = await bcrypt.hash('123', 10);
        
        if (!existingUsers.includes('superadmin')) {
            console.log(`Inserting default superadmin...`);
            await connection.query(
                `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`,
                ['superadmin', hashedPassword, 'superadmin']
            );
        }

        if (!existingUsers.includes('usuario')) {
            console.log(`Inserting default usuario...`);
            await connection.query(
                `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`,
                ['usuario', hashedPassword, 'usuario']
            );
        }

        console.log('Database initialization completed successfully!');

    } catch (error) {
        console.error('Error initializing database:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed.');
        }
    }
}

initDB();
