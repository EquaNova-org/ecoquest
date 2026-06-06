const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const crypto = require('crypto');
const supabase = require('../supabaseClient');

const upload = multer({ storage: multer.memoryStorage() });

// POST /api/submissions/submit
router.post('/submit', upload.single('photo'), async (req, res) => {
  console.log('Submission hit - user_id:', req.body.user_id, 'file:', req.file?.originalname);
  const { user_id } = req.body;

  if (!user_id || !req.file)
    return res.status(400).json({ error: 'user_id and photo are required' });

  // 1. Upload photo to Supabase Storage
  const fileName = `${user_id}/${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from('submissions')
    .upload(fileName, req.file.buffer, { contentType: req.file.mimetype });

  if (uploadError) return res.status(500).json({ error: uploadError.message });

  // 2. Get public URL
  const { data: urlData } = supabase.storage
    .from('submissions')
    .getPublicUrl(fileName);

  // 3. Save submission record
  const { data: submission, error: subError } = await supabase
    .from('submissions')
    .insert({ user_id, photo_url: urlData.publicUrl, status: 'pending' })
    .select()
    .single();

  if (subError) return res.status(500).json({ error: subError.message });

  res.status(201).json({ message: 'Submission received', submission });
});

// POST /api/submissions/approve/:id — called by admin dashboard
router.post('/approve/:id', async (req, res) => {
  const { id } = req.params;
  const POINTS_PER_APPROVAL = 150;

  // 1. Get the submission
  const { data: submission, error: subError } = await supabase
    .from('submissions')
    .select('id, user_id, status')
    .eq('id', id)
    .single();

  if (subError || !submission)
    return res.status(404).json({ error: 'Submission not found' });

  if (submission.status === 'approved')
    return res.status(400).json({ error: 'Already approved' });

  // 2. Mark submission as approved
  await supabase
    .from('submissions')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', id);

  // 3. Award 150 points to user
  const { data: user } = await supabase
    .from('users')
    .select('points')
    .eq('id', submission.user_id)
    .single();

  await supabase
    .from('users')
    .update({ points: (user.points || 0) + POINTS_PER_APPROVAL })
    .eq('id', submission.user_id);

  // 4. Regenerate QR token so user gets a fresh code
  await supabase
    .from('users')
    .update({ qr_token: crypto.randomUUID() })
    .eq('id', submission.user_id);

  res.json({ message: 'Approved! 150 points awarded and QR refreshed.' });
});

module.exports = router;