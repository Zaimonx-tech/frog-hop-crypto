import { getConnection } from '../config.js';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'adm_frogcrypto_2024';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const adminToken = req.headers['x-admin-token'];

    if (adminToken !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { playerId } = req.body;

    if (!playerId) {
      return res.status(400).json({ error: 'Player ID required' });
    }

    const connection = await getConnection();
    
    await connection.execute('DELETE FROM game_stats WHERE playerId = ?', [playerId]);
    await connection.execute('DELETE FROM transactions WHERE playerId = ?', [playerId]);
    await connection.execute('DELETE FROM players WHERE id = ?', [playerId]);
    await connection.execute('DELETE FROM leaderboard WHERE id = ?', [playerId]);
    
    await connection.end();

    return res.status(200).json({ success: true, message: 'Player deleted' });
  } catch (error) {
    console.error('Delete player error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}