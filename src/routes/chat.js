import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const router = express.Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new sqlite3.Database(join(__dirname, '../../chat.db'));

// Protection de toutes les routes du chat
router.use(authenticateToken);

// Récupérer l'historique des messages
router.get('/messages', (req, res) => {
  const limit = 50; // Nombre de messages à charger

  db.all(`
    SELECT m.*, u.username 
    FROM messages m 
    JOIN users u ON m.user_id = u.id 
    ORDER BY m.created_at DESC 
    LIMIT ?
  `, [limit], (err, messages) => {
    if (err) {
      return res.status(500).json({ error: 'Erreur lors de la récupération des messages' });
    }
    res.json(messages.reverse());
  });
});

export { router as chatRouter };