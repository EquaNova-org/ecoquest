const express  = require('express');
const router   = express.Router();
const supabase = require('../supabaseClient');

const REFERRAL_POINTS = 50; // points awarded to both users on referral

// POST /api/auth/register
router.post('/register', async (req, res) => {
  console.log('Register hit with:', req.body);
  const { email, password, username, referral_code } = req.body;

  if (!email || !password || !username)
    return res.status(400).json({ error: 'email, password and username are required' });

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  console.log('authData:', authData);
  console.log('authError:', authError);
  
if (authError) return res.status(400).json({ error: authError.message });

  // 2. Find referrer if code provided
  let referred_by = null;
  let referrer = null;
  if (referral_code) {
    const { data } = await supabase
      .from('users')
      .select('id, points')
      .eq('referral_code', referral_code)
      .single();
    if (data) {
      referred_by = data.id;
      referrer = data;
    }
  }

  // 3. Insert into public.users (new user gets points if referred)
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      auth_id: authData.user.id,
      email,
      username,
      referred_by,
      points: referred_by ? REFERRAL_POINTS : 0  // new user gets points
    })
    .select()
    .single();

    console.log('userInsert data:', user);
    console.log('userInsert error:', userError);
  
if (userError) return res.status(400).json({ error: userError.message });

  // 4. Award points to referrer and log referral record
  if (referred_by && referrer) {
    // Give points to referrer
    await supabase
      .from('users')
      .update({ points: (referrer.points || 0) + REFERRAL_POINTS })
      .eq('id', referred_by);

    // Log referral with points_granted
    await supabase.from('referrals').insert({
      referrer_id: referred_by,
      referred_id: user.id,
      points_granted: true,
      granted_at: new Date().toISOString()
    });
  }

  res.status(201).json({ message: 'Registered successfully', user });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'email and password are required' });

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (authError) return res.status(400).json({ error: authError.message });

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', authData.user.id)
    .single();
  if (userError) return res.status(400).json({ error: userError.message });

  res.json({ message: 'Login successful', user });
});

module.exports = router;