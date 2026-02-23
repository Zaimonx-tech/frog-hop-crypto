import pg from 'pg';
const { Client } = pg;

export async function getConnection() {
  const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  await client.connect();
  return client;
}

export async function initDatabase() {
  try {
    const client = await getConnection();

    // Create players table
    await client.query(`
      CREATE TABLE IF NOT EXISTS players (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE,
        phone VARCHAR(20) UNIQUE,
        avatar VARCHAR(10) DEFAULT '🐸',
        "passHash" VARCHAR(255) NOT NULL,
        "bestScore" INT DEFAULT 0,
        "maxLevel" INT DEFAULT 1,
        "totalCoins" INT DEFAULT 0,
        "totalDeaths" INT DEFAULT 0,
        "maxCombo" INT DEFAULT 1,
        "gamesPlayed" INT DEFAULT 0,
        "totalGems" INT DEFAULT 0,
        "cryptoEarned" DECIMAL(18,6) DEFAULT 0,
        "cryptoBalance" DECIMAL(18,6) DEFAULT 0,
        "ownedFrogs" JSONB DEFAULT '[]',
        "equippedFrog" INT DEFAULT 0,
        wallet JSONB DEFAULT '{"btc":0,"eth":0,"sol":0,"bnb":0,"gems":0}',
        "isAdmin" BOOLEAN DEFAULT FALSE,
        "isActive" BOOLEAN DEFAULT TRUE,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "lastLogin" TIMESTAMP
      )
    `);

    // Create leaderboard table
    await client.query(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        score INT DEFAULT 0,
        level INT DEFAULT 1,
        combo INT DEFAULT 1,
        avatar VARCHAR(10),
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create game_stats table
    await client.query(`
      CREATE TABLE IF NOT EXISTS game_stats (
        id SERIAL PRIMARY KEY,
        "playerId" VARCHAR(100) NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        "levelPlayed" INT,
        "scoreEarned" INT,
        "timeSpent" INT,
        "coinsCollected" INT,
        "deathCount" INT,
        "completedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        "playerId" VARCHAR(100) NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        type VARCHAR(50) DEFAULT 'earn',
        amount DECIMAL(18,6),
        "coinType" VARCHAR(10),
        description VARCHAR(255),
        "balanceAfter" DECIMAL(18,6),
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.end();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}
