import { getConnection } from '../config.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const limit = Math.min(parseInt(req.query.limit || '100'), 500);

    const client = await getConnection();

    try {
      const result = await client.query(
        `SELECT id, name, score, level, combo, avatar, "updatedAt"
         FROM leaderboard
         ORDER BY score DESC, level DESC, combo DESC
         LIMIT $1`,
        [limit]
      );

      await client.end();

      return res.status(200).json({ success: true, leaderboard: result.rows });
    } catch (error) {
      await client.end();
      throw error;
    }
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
