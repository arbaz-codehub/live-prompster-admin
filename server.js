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

// --- SCHEMA DEFINITION & VALIDATION ---
const schemas = {
  collections: {
    id: { type: 'string', required: false },
    user_id: { type: 'string', required: true },
    name: { type: 'string', required: true },
    created_at: { type: 'string', required: false },
    description: { type: 'string', required: false }
  },
  marketplace_items: {
    id: { type: 'string', required: false },
    title: { type: 'string', required: true },
    slug: { type: 'string', required: false },
    description: { type: 'string', required: true },
    detailed_description: { type: 'string', required: false },
    tag: { type: 'string', required: false },
    image_url: { type: 'string', required: false },
    screenshots: { type: 'array', required: false },
    link: { type: 'string', required: false },
    price: { type: 'number', required: false },
    why_not_buy: { type: 'array', required: false },
    status: { type: 'string', required: false },
    created_at: { type: 'string', required: false }
  },
  orders: {
    order_id: { type: 'string', required: true },
    user_id: { type: 'string', required: true },
    amount: { type: 'number', required: true },
    currency: { type: 'string', required: false },
    status: { type: 'string', required: false },
    item_type: { type: 'string', required: false },
    item_id: { type: 'string', required: true },
    created_at: { type: 'string', required: false }
  },
  page_views: {
    id: { type: 'string', required: false },
    session_id: { type: 'string', required: true },
    path: { type: 'string', required: true },
    created_at: { type: 'string', required: false }
  },
  promo_banners: {
    id: { type: 'string', required: false },
    title: { type: 'string', required: true },
    image_url: { type: 'string', required: true },
    target_url: { type: 'string', required: true },
    is_active: { type: 'boolean', required: false },
    created_at: { type: 'string', required: false }
  },
  prompts: {
    id: { type: 'string', required: false },
    slug: { type: 'string', required: true },
    title: { type: 'string', required: true },
    content: { type: 'string', required: true },
    prompts: { type: 'array', required: false },
    tags: { type: 'array', required: false },
    category: { type: 'string', required: true },
    images: { type: 'array', required: false },
    created_at: { type: 'string', required: false },
    updated_at: { type: 'string', required: false },
    seo_description: { type: 'string', required: false },
    pack_id: { type: 'string', required: false },
    pack_title: { type: 'string', required: false },
    pack_image_url: { type: 'string', required: false }
  },
  resources_items: {
    id: { type: 'string', required: true },
    title: { type: 'string', required: true },
    description: { type: 'string', required: true },
    icon: { type: 'string', required: false },
    color: { type: 'string', required: false },
    count: { type: 'string', required: false },
    image_url: { type: 'string', required: false },
    created_at: { type: 'string', required: false }
  },
  tool_requests: {
    id: { type: 'string', required: false },
    email: { type: 'string', required: false },
    idea_description: { type: 'string', required: true },
    created_at: { type: 'string', required: false }
  },
  tools_items: {
    id: { type: 'string', required: false },
    title: { type: 'string', required: true },
    description: { type: 'string', required: true },
    tag: { type: 'string', required: false },
    image_url: { type: 'string', required: false },
    link: { type: 'string', required: false },
    status: { type: 'string', required: false },
    created_at: { type: 'string', required: false }
  },
  user_profiles: {
    id: { type: 'string', required: false },
    email: { type: 'string', required: true },
    preferences: { type: 'array', required: false },
    created_at: { type: 'string', required: false },
    updated_at: { type: 'string', required: false },
    name: { type: 'string', required: false },
    favorites: { type: 'array', required: false }
  },
  user_prompts: {
    id: { type: 'string', required: false },
    user_id: { type: 'string', required: true },
    collection_id: { type: 'string', required: false },
    title: { type: 'string', required: true },
    content: { type: 'string', required: true },
    category: { type: 'string', required: false },
    price: { type: 'string', required: false },
    tags: { type: 'array', required: false },
    created_at: { type: 'string', required: false },
    updated_at: { type: 'string', required: false },
    example: { type: 'string', required: false }
  },
  waitlist_emails: {
    id: { type: 'string', required: false },
    email: { type: 'string', required: true },
    created_at: { type: 'string', required: false }
  },
  workshop_registrations: {
    id: { type: 'string', required: false },
    user_id: { type: 'string', required: true },
    workshop_id: { type: 'string', required: true },
    order_id: { type: 'string', required: true },
    status: { type: 'string', required: false },
    created_at: { type: 'string', required: false }
  },
  workshops: {
    id: { type: 'string', required: false },
    slug: { type: 'string', required: true },
    title: { type: 'string', required: true },
    topic: { type: 'string', required: true },
    scheduled_date: { type: 'string', required: true },
    duration_minutes: { type: 'number', required: true },
    format: { type: 'string', required: false },
    eligibility: { type: 'string', required: false },
    fee_amount: { type: 'number', required: true },
    invite_link_or_venue: { type: 'string', required: true }
  }
};

const validatePayload = (table, payload, isPartial = false) => {
  const schema = schemas[table];
  if (!schema) return { valid: false, error: `Table '${table}' not found in schema` };

  const errors = [];
  
  // Check for unknown fields
  for (const key of Object.keys(payload)) {
    if (!schema[key]) {
      errors.push(`Unknown field '${key}' for table '${table}'`);
    }
  }

  // Validate fields against schema
  for (const [key, definition] of Object.entries(schema)) {
    if (!isPartial && definition.required) {
      if (payload[key] === undefined || payload[key] === null) {
        errors.push(`Missing required field '${key}'`);
        continue;
      }
    }

    if (payload[key] !== undefined && payload[key] !== null) {
      const val = payload[key];
      if (definition.type === 'array' && !Array.isArray(val)) {
        errors.push(`Field '${key}' must be an array`);
      } else if (definition.type !== 'array' && typeof val !== definition.type) {
        errors.push(`Field '${key}' must be of type ${definition.type}`);
      }
    }
  }

  return { valid: errors.length === 0, error: errors.join(', ') };
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
  const validation = validatePayload(table, req.body, false);
  if (!validation.valid) {
    return res.status(400).json({ error: 'Validation failed: ' + validation.error });
  }

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
  const validation = validatePayload(table, req.body, true);
  if (!validation.valid) {
    return res.status(400).json({ error: 'Validation failed: ' + validation.error });
  }

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
