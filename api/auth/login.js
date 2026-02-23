import { getConnection } from '../config.js';

function hashPass(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36) + '_' + str.length;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/Phone and password required' });
    }

    const client = await getConnection();

    try {
      const result = await client.query(
        'SELECT * FROM players WHERE (email = $1 OR phone = $2) AND "isActive" = true LIMIT 1',
        [identifier, identifier]
      );

      if (result.rows.length === 0) {
        await client.end();
        return res.status(401).json({ error: 'Account not found' });
      }

      const player = result.rows[0];
      const passHash = hashPass(password);

      if (player.passHash !== passHash) {
        await client.end();
        return res.status(401).json({ error: 'Incorrect password' });
      }

      // Update last login
      await client.query(
        'UPDATE players SET "lastLogin" = NOW() WHERE id = $1',
        [player.id]
      );

      await client.end();

      // Parse JSON fields
      const ownedFrogs = typeof player.ownedFrogs === 'string'
        ? JSON.parse(player.ownedFrogs)
        : player.ownedFrogs;
      const wallet = typeof player.wallet === 'string'
        ? JSON.parse(player.wallet)
        : player.wallet;

      return res.status(200).json({
        success: true,
        player: {
          id: player.id,
          name: player.name,
          email: player.email,
          phone: player.phone,
          avatar: player.avatar,
          bestScore: player.bestScore,
          maxLevel: player.maxLevel,
          totalCoins: player.totalCoins,
          totalDeaths: player.totalDeaths,
          maxCombo: player.maxCombo,
          gamesPlayed: player.gamesPlayed,
          totalGems: player.totalGems,
          cryptoEarned: parseFloat(player.cryptoEarned),
          cryptoBalance: parseFloat(player.cryptoBalance),
          ownedFrogs,
          equippedFrog: player.equippedFrog,
          wallet,
          isAdmin: player.isAdmin,
          createdAt: player.createdAt
        }
      });
    } catch (error) {
      await client.end();
      throw error;
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
