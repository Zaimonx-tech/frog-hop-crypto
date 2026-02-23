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

    const client = await getConnection();

    try {
      // Get player
      const playerResult = await client.query(
        'SELECT * FROM players WHERE id = $1 LIMIT 1',
        [playerId]
      );

      if (playerResult.rows.length === 0) {
        await client.end();
        return res.status(404).json({ error: 'Player not found' });
      }

      const player = playerResult.rows[0];
      const balance = parseFloat(player.cryptoBalance);

      if (balance < price) {
        await client.end();
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      // Parse owned frogs
      const ownedFrogs = typeof player.ownedFrogs === 'string'
        ? JSON.parse(player.ownedFrogs)
        : player.ownedFrogs;

      if (ownedFrogs.includes(frogId)) {
        await client.end();
        return res.status(400).json({ error: 'You already own this frog' });
      }

      // Add frog and deduct balance
      ownedFrogs.push(frogId);
      const newBalance = balance - price;

      await client.query(
        `UPDATE players SET
          "cryptoBalance" = $1, "ownedFrogs" = $2, "equippedFrog" = $3
         WHERE id = $4`,
        [newBalance, JSON.stringify(ownedFrogs), frogId, playerId]
      );

      // Record transaction
      await client.query(
        `INSERT INTO transactions ("playerId", type, amount, description, "balanceAfter")
         VALUES ($1, $2, $3, $4, $5)`,
        [playerId, 'purchase', price, `Bought Frog #${frogId}`, newBalance]
      );

      await client.end();

      return res.status(200).json({
        success: true,
        message: 'Frog purchased',
        newBalance,
        ownedFrogs
      });
    } catch (error) {
      await client.end();
      throw error;
    }
  } catch (error) {
    console.error('Buy frog error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
