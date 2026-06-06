const express  = require('express');
const router   = express.Router();
const supabase = require('../supabaseClient');

// GET /api/rankings
router.get('/', async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;

  const { data, error } = await supabase
    .from('users')
    .select('id, username, points')
    .order('points', { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ error: error.message });

  // Attach rank number
  const ranked = data.map((user, i) => ({ ...user, rank: i + 1 }));

  res.json({ rankings: ranked });
});

module.exports = router;