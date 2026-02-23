import { getConnection } from '../config.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      playerId,
      bestScore,
      maxLevel,
      totalCoins,
      totalDeaths,
      maxCombo,
      gamesPlayed,
      totalGems,
      cryptoEarned,
      cryptoBalance,
      ownedFrogs,
      equippedFrog,
      wallet,
      levelStats
    } = req.body;

    if (!playerId) {
      return res.status(400).json({ error: 'Player ID required' });
    }

    const connection = await getConnection();

    // Update player stats
    await connection.execute(
      `UPDATE players SET
        bestScore = ?, maxLevel = ?, totalCoins = ?, totalDeaths = ?,
        maxCombo = ?, gamesPlayed = ?, totalGems = ?, cryptoEarned = ?,
        cryptoBalance = ?, ownedFrogs = ?, equippedFrog = ?, wallet = ?
       WHERE id = ?`,
      [
        bestScore || 0,
        maxLevel || 1,
        totalCoins || 0,
        totalDeaths || 0,
        maxCombo || 1,
        gamesPlayed || 0,
        totalGems || 0,
        cryptoEarned || 0,
        cryptoBalance || 0,
        JSON.stringify(ownedFrogs || [0]),
        equippedFrog || 0,
        JSON.stringify(wallet || {}),
        playerId
      ]
    );

    // Update leaderboard
    await connection.execute(
      `INSERT INTO leaderboard (id, score, level, combo)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       score = GREATEST(score, ?), level = ?, combo = ?`,
      [playerId, bestScore || 0, maxLevel || 1, maxCombo || 1, bestScore || 0, maxLevel || 1, maxCombo || 1]
    );

    // Record level stats if provided
    if (levelStats) {
      await connection.execute(
        `INSERT INTO game_stats (playerId, levelPlayed, scoreEarned, timeSpent, coinsCollected, deathCount)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          playerId,
          levelStats.level || 0,
          levelStats.score || 0,
          levelStats.time || 0,
          levelStats.coins || 0,
          levelStats.deaths || 0
        ]
      );
    }

    await connection.end();

    return res.status(200).json({ success: true, message: 'Progress saved' });
  } catch (error) {
    console.error('Save progress error:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
}