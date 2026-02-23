import { getConnection } from '../config.js';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'adm_frogcrypto_2024';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const adminToken = req.headers['x-admin-token'];

    if (adminToken !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const connection = await getConnection();
    const [players] = await connection.execute(
      `SELECT id, name, email, phone, avatar, bestScore, maxLevel, totalCoins,
              cryptoBalance, equippedFrog, gamesPlayed, createdAt, lastLogin
       FROM players ORDER BY bestScore DESC`
    );
    await connection.end();

    const formatted = players.map(p => ({
      ...p,
      cryptoBalance: parseFloat(p.cryptoBalance || 0)
    }));

    return res.status(200).json({ success: true, players: formatted });
  } catch (error) {
    console.error('Get all players error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}