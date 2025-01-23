import express from 'express';
import bcrypt from 'bcrypt';
import { authenticateToken, isAdmin } from '../middleware/auth.js';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const router = express.Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new sqlite3.Database(join(__dirname, '../../chat.db'));

// Protection de toutes les routes admin
router.use(authenticateToken, isAdmin);

// Créer un nouvel utilisateur
router.post('/users', async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, role],
      function(err) {
        if (err) {
          return res.status(400).json({ error: 'Nom d\'utilisateur ou email déjà utilisé' });
        }
        res.status(201).json({ id: this.lastID, username, email, role });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur' });
  }
});

// Modifier un utilisateur
router.put('/users/:id', async (req, res) => {
  const { role } = req.body;
  const userId = req.params.id;

  db.run(
    'UPDATE users SET role = ? WHERE id = ?',
    [role, userId],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Erreur lors de la modification de l\'utilisateur' });
      }
      res.json({ message: 'Utilisateur modifié avec succès' });
    }
  );
});

// Récupérer la liste des utilisateurs
router.get('/users', (req, res) => {
  db.all(
    'SELECT id, username, email, role, created_at FROM users',
    (err, users) => {
      if (err) {
        return res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
      }
      res.json(users);
    }
  );
});

// Récupérer les logs de sécurité
router.get('/security-logs', (req, res) => {
  db.all(
    `SELECT l.*, u.username 
     FROM security_logs l 
     LEFT JOIN users u ON l.user_id = u.id 
     ORDER BY l.created_at DESC 
     LIMIT 100`,
    (err, logs) => {
      if (err) {
        return res.status(500).json({ error: 'Erreur lors de la récupération des logs' });
      }
      res.json(logs);
    }
  );
});

export { router as adminRouter };