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

    const connection = await getConnection();

    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (email !== undefined) {
      updateFields.push('email = ?');
      updateValues.push(email);
    }
    if (bestScore !== undefined) {
      updateFields.push('bestScore = ?');
      updateValues.push(bestScore);
    }
    if (maxLevel !== undefined) {
      updateFields.push('maxLevel = ?');
      updateValues.push(maxLevel);
    }
    if (cryptoBalance !== undefined) {
      updateFields.push('cryptoBalance = ?');
      updateValues.push(cryptoBalance);
    }
    if (ownedFrogs) {
      updateFields.push('ownedFrogs = ?');
      updateValues.push(JSON.stringify(ownedFrogs));
    }
    if (equippedFrog !== undefined) {
      updateFields.push('equippedFrog = ?');
      updateValues.push(equippedFrog);
    }
    if (newPassword) {
      updateFields.push('passHash = ?');
      updateValues.push(hashPass(newPassword));
    }
    if (isActive !== undefined) {
      updateFields.push('isActive = ?');
      updateValues.push(isActive ? 1 : 0);
    }

    if (updateFields.length === 0) {
      await connection.end();
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateValues.push(playerId);
    const query = `UPDATE players SET ${updateFields.join(', ')} WHERE id = ?`;

    await connection.execute(query, updateValues);
    await connection.end();

    return res.status(200).json({ success: true, message: 'Player updated' });
  } catch (error) {
    console.error('Update player error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}