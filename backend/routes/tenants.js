// routes/tenants.js
const express = require('express');
const pool = require('../config/db');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, DATE_FORMAT(date_added, "%Y-%m-%d %H:%i:%s") AS date_added FROM tenants'
    );
    const tenants = [];
    for (const t of rows) {
      const [posRows] = await pool.query(
        'SELECT pos_id FROM tenant_pos_ids WHERE tenant_id = ?',
        [t.id]
      );
      tenants.push({
        id: t.id,
        name: t.name,
        dateAdded: t.date_added,
        posIds: posRows.map(r => r.pos_id),
      });
    }
    res.json(tenants);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { name, posIds } = req.body;
  if (!name || !Array.isArray(posIds) || posIds.length === 0) {
    return res.status(400).json({ error: 'name and non-empty posIds array required' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO tenants (name) VALUES (?)',
      [name]
    );
    const tenantId = result.insertId;
    for (const pid of posIds) {
      const trimmed = pid.trim();
      if (trimmed) {
        await conn.query(
          'INSERT INTO tenant_pos_ids (tenant_id, pos_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE pos_id=pos_id',
          [tenantId, trimmed]
        );
      }
    }
    await conn.commit();
    res.status(201).json({ id: tenantId, name, posIds });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

router.post('/:tenantId/posids', async (req, res) => {
  const { tenantId } = req.params;
  const { posId } = req.body;
  if (!posId) return res.status(400).json({ error: 'posId required' });
  try {
    const [rows] = await pool.query(
      'SELECT id FROM tenants WHERE id = ?',
      [tenantId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Tenant not found' });
    await pool.query(
      'INSERT INTO tenant_pos_ids (tenant_id, pos_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE pos_id=pos_id',
      [tenantId, posId.trim()]
    );
    res.status(201).json({ tenantId: parseInt(tenantId), posId: posId.trim() });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  try {
    const [result] = await pool.query(
      'DELETE FROM tenants WHERE id = ?',
      [tenantId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Tenant not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:tenantId/posids/:posId', async (req, res) => {
  const { tenantId, posId } = req.params;
  try {
    const [result] = await pool.query(
      'DELETE FROM tenant_pos_ids WHERE tenant_id = ? AND pos_id = ?',
      [tenantId, posId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'POS ID not found for tenant' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
