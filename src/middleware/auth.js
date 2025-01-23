import jwt from "jsonwebtoken";
import sqlite3 from "sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new sqlite3.Database(join(__dirname, "../../chat.db"));

export const authenticateToken = (req, res, next) => {
    console.log("Authenticating request:", req.path);
    console.log("Cookies:", req.cookies);

    const token = req.cookies.token;

    if (!token) {
        console.log("No token found");
        return res.status(401).json({ error: "Authentification requise" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error("Token verification error:", err);
            return res.status(403).json({ error: "Token invalide" });
        }

        console.log("User authenticated:", user);
        req.user = user;
        next();
    });
};

export const authenticateSocket = (socket, next) => {
    console.log("Authenticating socket connection");
    const token = socket.handshake.auth.token;

    if (!token) {
        console.log("No token found in socket connection");
        return next(new Error("Authentification requise"));
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error("Socket token verification error:", err);
            return next(new Error("Token invalide"));
        }

        console.log("Socket user authenticated:", user);
        socket.user = user;
        next();
    });
};

export const isAdmin = (req, res, next) => {
    console.log("Checking admin rights for:", req.user);
    if (req.user.role !== "admin") {
        console.log("Access denied: user is not admin");
        alert("Access denied: user is not admin");
        return res.status(403).json({ error: "Accès non autorisé" });
    }
    console.log("Admin access granted");
    next();
};
