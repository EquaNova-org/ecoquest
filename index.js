require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes        = require('./routes/auth');
const submissionRoutes  = require('./routes/submissions');
const rankingRoutes     = require('./routes/rankings');
const referralRoutes    = require('./routes/referrals');
const qrRoutes = require('./routes/qr');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth',        authRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/rankings',    rankingRoutes);
app.use('/api/referrals',   referralRoutes);
app.use('/api/qr', qrRoutes);

app.get('/', (req, res) => res.json({ status: 'EcoQuest API running' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));