require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = process.env.PORT || 3000;

// Initialize Supabase with Service Role Key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("CRITICAL ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Setup Supabase Realtime Subscription
// Listen to all changes on the public schema
supabase
  .channel('custom-all-channel')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public' },
    (payload) => {
      console.log('Realtime DB Change:', payload.table, payload.eventType);
      // Emit the change to all connected Socket.io clients
      io.emit('db_change', { table: payload.table, event: payload.eventType });
    }
  )
  .subscribe();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Middleware
const authMiddleware = (req, res, next) => {
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminPassword) {
    return res.status(500).json({ error: 'Server misconfiguration: No ADMIN_PASSWORD set in .env' });
  }

  const providedPassword = req.headers['x-admin-password'];

  if (providedPassword !== adminPassword) {
    return res.status(401).json({ error: 'Unauthorized: Invalid password' });
  }

  next();
};

// --- API ROUTES ---

app.use('/api', authMiddleware);

app.get('/api/categories', async (req, res) => {
  try {
    const { data, error } = await supabase.from('prompts').select('category');
    if (error) throw error;
    
    const catSet = new Set();
    data.forEach(p => { if (p.category) catSet.add(p.category) });
    
    res.json(Array.from(catSet).sort());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/data/:table', async (req, res) => {
  const { table } = req.params;
  const select = req.query.select || '*';
  
  try {
    let query = supabase.from(table).select(select);
    if (table !== 'workshops') {
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('scheduled_date', { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/data/:table', async (req, res) => {
  const { table } = req.params;
  try {
    const { data, error } = await supabase.from(table).insert([req.body]).select();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/data/:table/:id', async (req, res) => {
  const { table, id } = req.params;
  try {
    const { data, error } = await supabase.from(table).update(req.body).eq('id', id).select();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/data/:table/:id', async (req, res) => {
  const { table, id } = req.params;
  try {
    const { data, error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`Live CRUD Handler Admin Server running on http://localhost:${PORT}`);
});
