import { getConnection } from '../config.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { playerId } = req.query;

    if (!playerId) {
      return res.status(400).json({ error: 'Player ID required' });
    }

    const connection = await getConnection();
    const [players] = await connection.execute(
      'SELECT * FROM players WHERE id = ? LIMIT 1',
      [playerId]
    );
    await connection.end();

    if (players.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const player = players[0];
    const ownedFrogs = typeof player.ownedFrogs === 'string'
      ? JSON.parse(player.ownedFrogs)
      : player.ownedFrogs;
    const wallet = typeof player.wallet === 'string'
      ? JSON.parse(player.wallet)
      : player.wallet;

    return res.status(200).json({
      success: true,
      player: {
        ...player,
        cryptoEarned: parseFloat(player.cryptoEarned),
        cryptoBalance: parseFloat(player.cryptoBalance),
        ownedFrogs,
        wallet
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}