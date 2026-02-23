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

    const client = await getConnection();

    try {
      // Update player stats
      await client.query(
        `UPDATE players SET
          "bestScore" = $1, "maxLevel" = $2, "totalCoins" = $3, "totalDeaths" = $4,
          "maxCombo" = $5, "gamesPlayed" = $6, "totalGems" = $7, "cryptoEarned" = $8,
          "cryptoBalance" = $9, "ownedFrogs" = $10, "equippedFrog" = $11, wallet = $12
         WHERE id = $13`,
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
      await client.query(
        `INSERT INTO leaderboard (id, score, level, combo)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET
         score = GREATEST(leaderboard.score, $2), level = $3, combo = $4`,
        [playerId, bestScore || 0, maxLevel || 1, maxCombo || 1]
      );

      // Record level stats if provided
      if (levelStats) {
        await client.query(
          `INSERT INTO game_stats ("playerId", "levelPlayed", "scoreEarned", "timeSpent", "coinsCollected", "deathCount")
           VALUES ($1, $2, $3, $4, $5, $6)`,
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

      await client.end();

      return res.status(200).json({ success: true, message: 'Progress saved' });
    } catch (error) {
      await client.end();
      throw error;
    }
  } catch (error) {
    console.error('Save progress error:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
}
