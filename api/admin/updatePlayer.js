import { getConnection } from '../config.js';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'adm_frogcrypto_2024';

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const adminToken = req.headers['x-admin-token'];

    if (adminToken !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const {
      playerId,
      name,
      email,
      bestScore,
      maxLevel,
      cryptoBalance,
      ownedFrogs,
      equippedFrog,
      newPassword,
      isActive
    } = req.body;

    if (!playerId) {
      return res.status(400).json({ error: 'Player ID required' });
    }

    const client = await getConnection();

    try {
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (name !== undefined) {
        updateFields.push(`name = $${paramCount}`);
        updateValues.push(name);
        paramCount++;
      }
      if (email !== undefined) {
        updateFields.push(`email = $${paramCount}`);
        updateValues.push(email);
        paramCount++;
      }
      if (bestScore !== undefined) {
        updateFields.push(`"bestScore" = $${paramCount}`);
        updateValues.push(bestScore);
        paramCount++;
      }
      if (maxLevel !== undefined) {
        updateFields.push(`"maxLevel" = $${paramCount}`);
        updateValues.push(maxLevel);
        paramCount++;
      }
      if (cryptoBalance !== undefined) {
        updateFields.push(`"cryptoBalance" = $${paramCount}`);
        updateValues.push(cryptoBalance);
        paramCount++;
      }
      if (ownedFrogs) {
        updateFields.push(`"ownedFrogs" = $${paramCount}`);
        updateValues.push(JSON.stringify(ownedFrogs));
        paramCount++;
      }
      if (equippedFrog !== undefined) {
        updateFields.push(`"equippedFrog" = $${paramCount}`);
        updateValues.push(equippedFrog);
        paramCount++;
      }
      if (newPassword) {
        updateFields.push(`"passHash" = $${paramCount}`);
        updateValues.push(hashPass(newPassword));
        paramCount++;
      }
      if (isActive !== undefined) {
        updateFields.push(`"isActive" = $${paramCount}`);
        updateValues.push(isActive ? true : false);
        paramCount++;
      }

      if (updateFields.length === 0) {
        await client.end();
        return res.status(400).json({ error: 'No fields to update' });
      }

      updateValues.push(playerId);
      const query = `UPDATE players SET ${updateFields.join(', ')} WHERE id = $${paramCount}`;

      await client.query(query, updateValues);
      await client.end();

      return res.status(200).json({ success: true, message: 'Player updated' });
    } catch (error) {
      await client.end();
      throw error;
    }
  } catch (error) {
    console.error('Update player error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
