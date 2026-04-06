const express = require('express');
const router  = express.Router();
const store   = require('../lib/store');

router.get('/', (req, res) => res.json(store.readSnippets()));

router.post('/', (req, res) => {
  const { name, command, description = '', tags = [] } = req.body;
  if (!name || !command) return res.status(400).json({ error: 'name and command required' });
  const snippets = store.readSnippets();
  const item = { id: Date.now().toString(36), name, command, description, tags, createdAt: new Date().toISOString() };
  snippets.push(item);
  store.writeSnippets(snippets);
  res.json(item);
});

router.put('/:id', (req, res) => {
  const snippets = store.readSnippets();
  const idx = snippets.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  snippets[idx] = { ...snippets[idx], ...req.body };
  store.writeSnippets(snippets);
  res.json(snippets[idx]);
});

router.delete('/:id', (req, res) => {
  store.writeSnippets(store.readSnippets().filter(s => s.id !== req.params.id));
  res.json({ ok: true });
});

module.exports = router;
