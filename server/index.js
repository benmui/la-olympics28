'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const initSqlJs = require('sql.js');

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'la28-dev-secret';
const DB_PATH = path.resolve(__dirname, '../la28.db');

// ---------------------------------------------------------------------------
// Database helpers (wraps sql.js into a synchronous-style API)
// ---------------------------------------------------------------------------
let db;

function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function dbGet(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const row = stmt.step() ? stmt.getAsObject() : undefined;
  stmt.free();
  return row;
}

function dbAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function dbRun(sql, params = []) {
  db.run(sql, params);
  const rowid = db.exec('SELECT last_insert_rowid() AS id')[0]?.values[0]?.[0] ?? null;
  saveDb();
  return { lastInsertRowid: rowid };
}

// ---------------------------------------------------------------------------
// Bootstrap: load DB, create tables, start server
// ---------------------------------------------------------------------------
async function start() {
  const SQL = await initSqlJs();
  const buf = fs.readFileSync(DB_PATH);
  db = new SQL.Database(buf);

  db.run('PRAGMA foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS plan_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL,
      event_id INTEGER NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(plan_id, event_id),
      FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES competition_schedule(id)
    );
  `);

  // ---------------------------------------------------------------------------
  // Express app
  // ---------------------------------------------------------------------------
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Serve built React client
  const clientDist = path.resolve(__dirname, '../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
  }

  // Auth middleware
  function requireAuth(req, res, next) {
    const header = req.headers['authorization'];
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    try {
      req.user = jwt.verify(header.slice(7), JWT_SECRET);
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  function timeToMin(t) {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  function ownsPlan(userId, planId) {
    return dbGet('SELECT id FROM plans WHERE id = ? AND user_id = ?', [planId, userId]);
  }

  // ---------------------------------------------------------------------------
  // Auth routes
  // ---------------------------------------------------------------------------
  app.post('/api/auth/register', (req, res) => {
    const { username, password } = req.body;
    if (!username?.trim()) return res.status(400).json({ error: 'Username is required' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    try {
      const password_hash = bcrypt.hashSync(password, 10);
      const { lastInsertRowid } = dbRun(
        'INSERT INTO users (username, password_hash) VALUES (?, ?)',
        [username.trim(), password_hash]
      );
      const token = jwt.sign({ id: lastInsertRowid, username: username.trim() }, JWT_SECRET, { expiresIn: '7d' });
      return res.status(201).json({ token, username: username.trim() });
    } catch (err) {
      if (err.message?.includes('UNIQUE')) return res.status(400).json({ error: 'Username already taken' });
      console.error('Register error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

    try {
      const user = dbGet('SELECT * FROM users WHERE username = ?', [username.trim()]);
      if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, username: user.username });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ---------------------------------------------------------------------------
  // Schedule reference routes
  // ---------------------------------------------------------------------------
  app.get('/api/sports', (_req, res) => {
    try {
      const rows = dbAll('SELECT DISTINCT sport FROM competition_schedule WHERE sport IS NOT NULL ORDER BY sport ASC');
      return res.json(rows.map(r => r.sport));
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/dates', (_req, res) => {
    try {
      return res.json(dbAll('SELECT DISTINCT date, games_day FROM competition_schedule WHERE date IS NOT NULL ORDER BY CAST(games_day AS INTEGER)'));
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/zones', (_req, res) => {
    try {
      const rows = dbAll('SELECT DISTINCT zone FROM competition_schedule WHERE zone IS NOT NULL ORDER BY zone ASC');
      return res.json(rows.map(r => r.zone));
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/events', (req, res) => {
    const { sports, date, zone, search } = req.query;
    try {
      const conditions = [];
      const params = [];

      if (sports?.trim()) {
        const list = sports.split(',').map(s => s.trim()).filter(Boolean);
        if (list.length) {
          conditions.push(`sport IN (${list.map(() => '?').join(', ')})`);
          params.push(...list);
        }
      }
      if (date?.trim()) { conditions.push('date = ?'); params.push(date.trim()); }
      if (zone?.trim()) { conditions.push('zone = ?'); params.push(zone.trim()); }
      if (search?.trim()) {
        conditions.push('(sport LIKE ? OR session_description LIKE ? OR venue LIKE ? OR session_type LIKE ?)');
        const like = `%${search.trim()}%`;
        params.push(like, like, like, like);
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const sql = `SELECT * FROM competition_schedule ${where} ORDER BY CAST(games_day AS INTEGER), start_time`;
      return res.json(dbAll(sql, params));
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ---------------------------------------------------------------------------
  // Plans
  // ---------------------------------------------------------------------------
  app.get('/api/plans', requireAuth, (req, res) => {
    try {
      return res.json(dbAll('SELECT * FROM plans WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]));
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/plans', requireAuth, (req, res) => {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Plan name is required' });
    try {
      const { lastInsertRowid } = dbRun('INSERT INTO plans (user_id, name) VALUES (?, ?)', [req.user.id, name.trim()]);
      return res.status(201).json(dbGet('SELECT * FROM plans WHERE id = ?', [lastInsertRowid]));
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put('/api/plans/:id', requireAuth, (req, res) => {
    const planId = +req.params.id;
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Plan name is required' });
    try {
      if (!ownsPlan(req.user.id, planId)) return res.status(404).json({ error: 'Plan not found' });
      dbRun('UPDATE plans SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [name.trim(), planId]);
      return res.json(dbGet('SELECT * FROM plans WHERE id = ?', [planId]));
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/api/plans/:id', requireAuth, (req, res) => {
    const planId = +req.params.id;
    try {
      if (!ownsPlan(req.user.id, planId)) return res.status(404).json({ error: 'Plan not found' });
      dbRun('DELETE FROM plan_events WHERE plan_id = ?', [planId]);
      dbRun('DELETE FROM plans WHERE id = ?', [planId]);
      return res.json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ---------------------------------------------------------------------------
  // Plan events
  // ---------------------------------------------------------------------------
  app.get('/api/plans/:id/events', requireAuth, (req, res) => {
    const planId = +req.params.id;
    try {
      if (!ownsPlan(req.user.id, planId)) return res.status(404).json({ error: 'Plan not found' });

      const events = dbAll(`
        SELECT cs.*
        FROM plan_events pe
        JOIN competition_schedule cs ON cs.id = pe.event_id
        WHERE pe.plan_id = ?
        ORDER BY CAST(cs.games_day AS INTEGER), cs.start_time
      `, [planId]);

      const eventsWithConflicts = events.map(ev => {
        const evStart = timeToMin(ev.start_time);
        const evEnd = timeToMin(ev.end_time);
        const conflicts = events
          .filter(other =>
            other.id !== ev.id &&
            String(other.games_day) === String(ev.games_day) &&
            timeToMin(other.start_time) < evEnd &&
            timeToMin(other.end_time) > evStart
          )
          .map(o => o.id);
        return { ...ev, conflicts };
      });

      return res.json(eventsWithConflicts);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/plans/:id/events', requireAuth, (req, res) => {
    const planId = +req.params.id;
    const { event_id } = req.body;
    if (!event_id) return res.status(400).json({ error: 'event_id is required' });
    try {
      if (!ownsPlan(req.user.id, planId)) return res.status(404).json({ error: 'Plan not found' });
      dbRun('INSERT INTO plan_events (plan_id, event_id) VALUES (?, ?)', [planId, event_id]);
      return res.status(201).json({ success: true });
    } catch (err) {
      if (err.message?.includes('UNIQUE')) return res.status(400).json({ error: 'Event already added to this plan' });
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/api/plans/:id/events/:eventId', requireAuth, (req, res) => {
    const planId = +req.params.id;
    const eventId = +req.params.eventId;
    try {
      if (!ownsPlan(req.user.id, planId)) return res.status(404).json({ error: 'Plan not found' });
      dbRun('DELETE FROM plan_events WHERE plan_id = ? AND event_id = ?', [planId, eventId]);
      return res.json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Fall through to React for any non-API route
  if (fs.existsSync(clientDist)) {
    app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.listen(PORT, () => console.log(`LA28 server running on http://localhost:${PORT}`));
}

start().catch(err => { console.error('Failed to start server:', err); process.exit(1); });
