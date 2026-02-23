import { getConnection } from '../config.js';

function getFrogPrice(id) {
  return id === 0 ? 0 : id * 50;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { playerId, frogId } = req.body;

    if (!playerId || frogId === undefined) {
      return res.status(400).json({ error: 'Player ID and Frog ID required' });
    }

    const price = getFrogPrice(frogId);

    if (price === 0) {
      return res.status(400).json({ error: 'This frog cannot be purchased' });
    }

    const connection = await getConnection();

    // Get player
    const [players] = await connection.execute(
      'SELECT * FROM players WHERE id = ? LIMIT 1',
      [playerId]
    );

    if (players.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'Player not found' });
    }

    const player = players[0];
    const balance = parseFloat(player.cryptoBalance);

    if (balance < price) {
      await connection.end();
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Parse owned frogs
    const ownedFrogs = typeof player.ownedFrogs === 'string'
      ? JSON.parse(player.ownedFrogs)
      : player.ownedFrogs;

    if (ownedFrogs.includes(frogId)) {
      await connection.end();
      return res.status(400).json({ error: 'You already own this frog' });
    }

    // Add frog and deduct balance
    ownedFrogs.push(frogId);
    const newBalance = balance - price;

    await connection.execute(
      `UPDATE players SET
        cryptoBalance = ?, ownedFrogs = ?, equippedFrog = ?
       WHERE id = ?`,
      [newBalance, JSON.stringify(ownedFrogs), frogId, playerId]
    );

    // Record transaction
    await connection.execute(
      `INSERT INTO transactions (playerId, type, amount, description, balanceAfter)
       VALUES (?, ?, ?, ?, ?)`,
      [playerId, 'purchase', price, `Bought Frog #${frogId}`, newBalance]
    );

    await connection.end();

    return res.status(200).json({
      success: true,
      message: 'Frog purchased',
      newBalance,
      ownedFrogs
    });
  } catch (error) {
    console.error('Buy frog error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}