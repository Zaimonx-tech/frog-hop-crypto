import { getConnection } from '../config.js';

function hashPass(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36) + '_' + str.length;
}

function genId() {
  return 'usr_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, email, phone, password, avatar } = req.body;

    if (!name || name.length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    if (!email && !phone) {
      return res.status(400).json({ error: 'Email or phone required' });
    }

    const client = await getConnection();

    try {
      // Check if user already exists
      const existing = await client.query(
        'SELECT id FROM players WHERE email = $1 OR phone = $2 LIMIT 1',
        [email || null, phone || null]
      );

      if (existing.rows.length > 0) {
        await client.end();
        return res.status(409).json({ error: 'Account already exists' });
      }

      const userId = genId();
      const passHash = hashPass(password);

      // Insert new player
      await client.query(
        `INSERT INTO players 
         (id, name, email, phone, avatar, "passHash", "ownedFrogs", "equippedFrog", wallet)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          userId,
          name,
          email || null,
          phone || null,
          avatar || '🐸',
          passHash,
          JSON.stringify([0]),
          0,
          JSON.stringify({ btc: 0, eth: 0, sol: 0, bnb: 0, gems: 0 })
        ]
      );

      // Add to leaderboard
      await client.query(
        `INSERT INTO leaderboard (id, name, score, level, combo, avatar) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, name, 0, 1, 1, avatar || '🐸']
      );

      await client.end();

      return res.status(201).json({
        success: true,
        userId,
        message: 'Account created successfully'
      });
    } catch (error) {
      await client.end();
      throw error;
    }
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
}
