const express  = require('express');
const router   = express.Router();
const crypto = require('crypto');
const supabase = require('../supabaseClient');

// POST /api/qr/scan — called by the radar machine when it scans a QR code
router.post('/scan', async (req, res) => {
  const { user_id, qr_token } = req.body;
  console.log('QR scan hit:', { user_id, qr_token });

  if (!user_id || !qr_token)
    return res.status(400).json({ error: 'user_id and qr_token are required' });

  // 1. Validate token matches user
  const { data: user, error } = await supabase
    .from('users')
    .select('id, qr_token, username')
    .eq('id', user_id)
    .eq('qr_token', qr_token)
    .single();

  if (error || !user)
    return res.status(401).json({ error: 'Invalid or already used QR code' });

  // 2. Immediately regenerate token to prevent reuse
  const { error: updateError } = await supabase
    .from('users')
    .update({ qr_token: crypto.randomUUID() })
    .eq('id', user_id);

  if (updateError)
    return res.status(500).json({ error: 'Failed to regenerate QR token' });

  // 3. Create a pending submission record tied to this scan
  const { data: submission, error: subError } = await supabase
    .from('submissions')
    .insert({ user_id, status: 'pending', scanned_at: new Date().toISOString() })
    .select()
    .single();

  if (subError)
    return res.status(500).json({ error: subError.message });

  res.json({
    message: 'QR scanned successfully',
    username: user.username,
    submission_id: submission.id
  });
});

// POST /api/qr/refresh — called by app to get latest qr_token after approval
router.get('/token/:user_id', async (req, res) => {
  const { user_id } = req.params;

  const { data, error } = await supabase
    .from('users')
    .select('qr_token')
    .eq('id', user_id)
    .single();

  if (error || !data)
    return res.status(404).json({ error: 'User not found' });

  res.json({ qr_token: data.qr_token });
});

module.exports = router;