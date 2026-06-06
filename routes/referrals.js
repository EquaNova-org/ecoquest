const express  = require('express');
const router   = express.Router();
const supabase = require('../supabaseClient');

// POST /api/referrals/validate — check if a referral code exists
router.post('/validate', async (req, res) => {
  const { referral_code } = req.body;

  if (!referral_code) 
    return res.status(400).json({ valid: false, error: 'No referral code provided' });

  const { data, error } = await supabase
    .from('users')
    .select('id, username')
    .eq('referral_code', referral_code.trim())
    .single();

  if (error || !data) 
    return res.json({ valid: false });

  // Return the referrer's username so the UI can say "Invited by John!"
  res.json({ valid: true, referrer: data.username });
});

// GET /api/referrals/:user_id — get referral stats for a user
router.get('/:user_id', async (req, res) => {
  const { user_id } = req.params;

  const { data, error } = await supabase
    .from('referrals')
    .select('id, referred_id, points_granted, created_at, granted_at')
    .eq('referrer_id', user_id);

  if (error) return res.status(500).json({ error: error.message });

  res.json({
    total_referrals: data.length,
    approved: data.filter(r => r.points_granted).length,
    pending: data.filter(r => !r.points_granted).length,
    referrals: data
  });
});

module.exports = router;