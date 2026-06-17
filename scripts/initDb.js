const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const dbConfig = {
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '30mariafn@',
};

const DB_NAME = process.env.DB_NAME || 'midiago';

async function waitForMySQL(retries = 15, delayMs = 4000) {
    for (let i = 1; i <= retries; i++) {
        try {
            const conn = await mysql.createConnection(dbConfig);
            await conn.end();
            return;
        } catch (e) {
            console.log(`[initDb] MySQL não disponível (tentativa ${i}/${retries}), aguardando ${delayMs / 1000}s...`);
            await new Promise(r => setTimeout(r, delayMs));
        }
    }
    throw new Error('[initDb] MySQL não ficou disponível a tempo. Abortando.');
}

async function initDB() {
    let connection;
    try {
        await waitForMySQL();
        console.log(`[initDb] Conectando ao MySQL em ${dbConfig.host}...`);
        connection = await mysql.createConnection(dbConfig);

        console.log(`[initDb] Criando banco ${DB_NAME} se não existir...`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
        
        console.log(`[initDb] Usando banco ${DB_NAME}...`);
        await connection.query(`USE \`${DB_NAME}\``);

        console.log(`[initDb] Criando/verificando tabela users...`);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role ENUM('usuario', 'superadmin', 'cliente') DEFAULT 'usuario',
                avatar LONGTEXT NULL,
                email VARCHAR(100) NULL,
                phone VARCHAR(20) NULL,
                cep VARCHAR(10) NULL,
                address TEXT NULL,
                address_number VARCHAR(20) NULL,
                neighborhood VARCHAR(100) NULL,
                city VARCHAR(100) NULL,
                state VARCHAR(2) NULL,
                document_type ENUM('CPF', 'CNPJ') NULL,
                document_number VARCHAR(20) NULL,
                personal_token VARCHAR(255) UNIQUE NULL,
                video_quota INT DEFAULT 10,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Graceful update for existing databases
        console.log(`[initDb] Verificando colunas novas em users...`);
        const columnsToAdd = [
            'video_quota INT DEFAULT 10',
            'address_number VARCHAR(20) NULL',
            'neighborhood VARCHAR(100) NULL',
            'city VARCHAR(100) NULL',
            'state VARCHAR(2) NULL'
        ];
        
        for (const colDef of columnsToAdd) {
            try {
                await connection.query(`ALTER TABLE users ADD COLUMN ${colDef}`);
                console.log(`[initDb] Coluna adicionada: ${colDef.split(' ')[0]}`);
            } catch (e) {
                // Error means column exists, which is fine
            }
        }

        console.log(`[initDb] Criando/verificando tabela settings...`);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id INT PRIMARY KEY DEFAULT 1,
                favicon LONGTEXT NULL,
                background_image LONGTEXT NULL,
                lgpd_text TEXT NULL,
                cookie_text TEXT NULL,
                cookie_policy_link VARCHAR(255) NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CHECK (id = 1)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        console.log(`[initDb] Verificando colunas novas em settings...`);
        try {
            await connection.query(`ALTER TABLE settings ADD COLUMN background_image LONGTEXT NULL AFTER favicon`);
            console.log(`[initDb] Coluna background_image adicionada a settings.`);
        } catch (e) {
            // Error means column exists, which is fine
        }

        // Insert initial settings if none exist
        await connection.query(`
            INSERT IGNORE INTO settings (id, lgpd_text, cookie_text, cookie_policy_link) 
            VALUES (1, 'Nós respeitamos sua privacidade de acordo com a LGPD.', 'Usamos cookies para melhorar sua experiência.', '/privacy-policy')
        `);

        console.log(`[initDb] Criando/verificando tabela media...`);
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

        console.log(`[initDb] Criando/verificando tabela media_views...`);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS media_views (
                id INT AUTO_INCREMENT PRIMARY KEY,
                media_id INT NOT NULL,
                user_id INT DEFAULT NULL,
                viewer_ip VARCHAR(45) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        console.log(`[initDb] Verificando usuários padrão...`);
        const [users] = await connection.query('SELECT * FROM users WHERE username IN (?, ?)', ['usuario', 'superadmin']);
        
        const existingUsers = users.map(u => u.username);
        const hashedPassword = await bcrypt.hash('123', 10);
        
        if (!existingUsers.includes('superadmin')) {
            console.log(`[initDb] Inserindo superadmin padrão...`);
            await connection.query(
                `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`,
                ['superadmin', hashedPassword, 'superadmin']
            );
        }

        if (!existingUsers.includes('usuario')) {
            console.log(`[initDb] Inserindo usuario padrão...`);
            await connection.query(
                `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`,
                ['usuario', hashedPassword, 'usuario']
            );
        }

        console.log('[initDb] Inicialização do banco concluída com sucesso!');

    } catch (error) {
        console.error('[initDb] Erro na inicialização do banco:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

module.exports = { initDB };

// Permite execução direta: node scripts/initDb.js
if (require.main === module) {
    initDB().catch(err => {
        console.error(err);
        process.exit(1);
    });
}
