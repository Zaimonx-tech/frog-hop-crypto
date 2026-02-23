import mysql from 'mysql2/promise';

export async function getConnection() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelayMs: 0,
  });

  return connection;
}

export async function initDatabase() {
  try {
    const connection = await getConnection();

    // Players table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS players (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE,
        phone VARCHAR(20) UNIQUE,
        avatar VARCHAR(10) DEFAULT '🐸',
        passHash VARCHAR(255) NOT NULL,
        bestScore INT DEFAULT 0,
        maxLevel INT DEFAULT 1,
        totalCoins INT DEFAULT 0,
        totalDeaths INT DEFAULT 0,
        maxCombo INT DEFAULT 1,
        gamesPlayed INT DEFAULT 0,
        totalGems INT DEFAULT 0,
        cryptoEarned DECIMAL(18,6) DEFAULT 0,
        cryptoBalance DECIMAL(18,6) DEFAULT 0,
        ownedFrogs JSON DEFAULT '[]',
        equippedFrog INT DEFAULT 0,
        wallet JSON DEFAULT '{"btc":0,"eth":0,"sol":0,"bnb":0,"gems":0}',
        isAdmin BOOLEAN DEFAULT FALSE,
        isActive BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        lastLogin TIMESTAMP,
        INDEX(email),
        INDEX(phone),
        INDEX(createdAt),
        INDEX(bestScore)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Leaderboard table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        score INT DEFAULT 0,
        level INT DEFAULT 1,
        combo INT DEFAULT 1,
        avatar VARCHAR(10),
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX(score),
        INDEX(level)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Game stats table (for analytics)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS game_stats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        playerId VARCHAR(100) NOT NULL,
        levelPlayed INT,
        scoreEarned INT,
        timeSpent INT,
        coinsCollected INT,
        deathCount INT,
        completedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (playerId) REFERENCES players(id) ON DELETE CASCADE,
        INDEX(playerId),
        INDEX(completedAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Transaction history table (for crypto tracking)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        playerId VARCHAR(100) NOT NULL,
        type ENUM('earn', 'spend', 'purchase', 'bonus') DEFAULT 'earn',
        amount DECIMAL(18,6),
        coinType VARCHAR(10),
        description VARCHAR(255),
        balanceAfter DECIMAL(18,6),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (playerId) REFERENCES players(id) ON DELETE CASCADE,
        INDEX(playerId),
        INDEX(createdAt),
        INDEX(type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.end();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}