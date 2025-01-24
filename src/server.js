import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import sqlite3 from "sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import cors from "cors";

import { authRouter } from "./routes/auth.js";
import { chatRouter } from "./routes/chat.js";
import { adminRouter } from "./routes/admin.js";
import { authenticateSocket } from "./middleware/auth.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
    },
});

// Configuration de la base de données
const db = new sqlite3.Database(join(__dirname, "../chat.db"));

// Middleware de sécurité
app.use(helmet());
app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
    })
);
app.use(express.json());
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limite chaque IP à 100 requêtes par fenêtre
});
app.use(limiter);

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Routes
app.use("/api/auth", authRouter);
app.use("/api/chat", chatRouter);
app.use("/api/admin", adminRouter);

// Servir les fichiers statiques du frontend
app.use(express.static(join(__dirname, "../dist")));

// Gestion des WebSockets
io.use((socket, next) => {
    console.log("Socket.IO authentication attempt:", socket.handshake.auth);
    const token = socket.handshake.auth.token;
    if (!token) {
        console.log("No token found in socket connection");
        return next(new Error("Authentication error"));
    }
    authenticateSocket(socket, next);
});

const connectedUsers = new Map();

io.on("connection", (socket) => {
    console.log("New socket connection:", socket.id);
    console.log("User connected:", socket.user);

    const userId = socket.user.id;
    connectedUsers.set(userId, socket.user);

    // Informer tous les clients du nouvel utilisateur
    io.emit("users_update", Array.from(connectedUsers.values()));

    socket.on("message", async (data) => {
        console.log("Message received:", data);
        try {
            const { content, formattedContent } = data;

            // Sauvegarder le message dans la base de données
            db.run(
                "INSERT INTO messages (user_id, content, formatted_content) VALUES (?, ?, ?)",
                [userId, content, formattedContent],
                function (err) {
                    if (err) {
                        console.error("Database error:", err);
                        throw err;
                    }

                    const message = {
                        id: this.lastID,
                        userId,
                        username: socket.user.username,
                        content,
                        formattedContent,
                        created_at: new Date().toISOString(),
                    };

                    console.log("Emitting message:", message);
                    io.emit("message", message);
                }
            );
        } catch (error) {
            console.error("Error handling message:", error);
            socket.emit("error", "Erreur lors de l'envoi du message");
        }
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.user);
        connectedUsers.delete(userId);
        io.emit("users_update", Array.from(connectedUsers.values()));
    });
});

// Panic Button Handler
app.post("/api/admin/panic", async (req, res) => {
    console.log("Panic button activated by:", req.user);
    try {
        // Déconnecter tous les utilisateurs
        io.emit("panic_activated", {
            message:
                "Le chat a été temporairement désactivé par un administrateur.",
            redirect: "https://ecoledirecte.com",
        });

        // Journaliser l'événement
        db.run(
            "INSERT INTO security_logs (event_type, description, user_id) VALUES (?, ?, ?)",
            ["panic_button", "Panic button activated", req.user.id]
        );

        // Fermer toutes les connexions
        io.disconnectSockets();

        res.json({ success: true });
    } catch (error) {
        console.error("Erreur lors de l'activation du panic button:", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Rediriger toutes les autres requêtes vers le frontend
app.get("*", (req, res) => {
    res.sendFile(join(__dirname, "../dist/index.html"));
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
