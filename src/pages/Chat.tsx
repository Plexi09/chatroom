import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import {
    Container,
    Paper,
    Box,
    Typography,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Drawer,
    AppBar,
    Toolbar,
    Badge,
    Button,
} from "@mui/material";
import {
    Send as SendIcon,
    People as PeopleIcon,
    ExitToApp as LogoutIcon,
    AdminPanelSettings as AdminIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Message {
    id: number;
    username: string;
    content: string;
    formattedContent: string;
    created_at: string;
}

interface ConnectedUser {
    id: number;
    username: string;
    role: string;
}

const DRAWER_WIDTH = 240;

const modules = {
    toolbar: [
        [{ header: [1, 2, false] }],
        ["bold", "italic", "underline", "strike", "blockquote"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link", "code-block"],
        ["clean"],
    ],
};

export default function Chat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [content, setContent] = useState("");
    const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const socketRef = useRef<Socket>();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        console.log("Initializing Socket.IO connection...");
        socketRef.current = io("http://localhost:3000", {
            auth: {
                token: document.cookie.replace(
                    /(?:(?:^|.*;\s*)token\s*=\s*([^;]*).*$)|^.*$/,
                    "$1"
                ),
            },
            withCredentials: true,
        });

        console.log("Loading initial messages...");
        fetch("http://localhost:3000/api/chat/messages", {
            credentials: "include",
        })
            .then((res) => res.json())
            .then((data) => {
                console.log("Initial messages loaded:", data);
                setMessages(data);
            })
            .catch((error) => console.error("Error loading messages:", error));

        socketRef.current.on("connect", () => {
            console.log("Socket.IO connected successfully");
        });

        socketRef.current.on("connect_error", (error) => {
            console.error("Socket.IO connection error:", error);
        });

        socketRef.current.on("message", (message: Message) => {
            console.log("New message received:", message);
            setMessages((prev) => [...prev, message]);
        });

        socketRef.current.on("users_update", (users: ConnectedUser[]) => {
            console.log("Users update received:", users);
            setConnectedUsers(users);
        });

        socketRef.current.on(
            "panic_activated",
            (data: { message: string; redirect: string }) => {
                console.log("Panic mode activated:", data);
                alert(data.message);
                window.location.href = data.redirect;
            }
        );

        return () => {
            console.log("Cleaning up Socket.IO connection...");
            socketRef.current?.disconnect();
        };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = () => {
        if (!content.trim()) return;

        console.log("Sending message:", content);
        socketRef.current?.emit(
            "message",
            {
                content: content,
                formattedContent: content,
            },
            (response: any) => {
                console.log("Message send response:", response);
            }
        );

        setContent("");
    };

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    const navigateToAdmin = () => {
        navigate("/admin");
    };

    const handlePanic = async () => {
        try {
            console.log("Activating panic mode...");
            const response = await fetch(
                "http://localhost:3000/api/admin/panic",
                {
                    method: "POST",
                    credentials: "include",
                }
            );
            console.log("Panic mode response:", response);
        } catch (error) {
            console.error("Error activating panic mode:", error);
        }
    };

    return (
        <Box sx={{ display: "flex", height: "100vh" }}>
            <AppBar
                position="fixed"
                sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
            >
                <Toolbar>
                    <Typography
                        variant="h6"
                        noWrap
                        component="div"
                        sx={{ flexGrow: 1 }}
                    >
                        Chat en temps réel
                    </Typography>
                    {user?.role === "admin" && (
                        <>
                            <Button
                                color="inherit"
                                startIcon={<AdminIcon />}
                                onClick={navigateToAdmin}
                                sx={{ mr: 2 }}
                            >
                                Admin Panel
                            </Button>
                            <Button
                                color="error"
                                variant="contained"
                                onClick={handlePanic}
                                sx={{ mr: 2 }}
                            >
                                PANIC
                            </Button>
                        </>
                    )}
                    <IconButton
                        color="inherit"
                        onClick={() => setDrawerOpen(true)}
                    >
                        <Badge
                            badgeContent={connectedUsers.length}
                            color="secondary"
                        >
                            <PeopleIcon />
                        </Badge>
                    </IconButton>
                    <IconButton color="inherit" onClick={handleLogout}>
                        <LogoutIcon />
                    </IconButton>
                </Toolbar>
            </AppBar>

            <Drawer
                anchor="right"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                sx={{
                    width: DRAWER_WIDTH,
                    flexShrink: 0,
                    "& .MuiDrawer-paper": {
                        width: DRAWER_WIDTH,
                        boxSizing: "border-box",
                    },
                }}
            >
                <Toolbar />
                <Box sx={{ overflow: "auto" }}>
                    <List>
                        {connectedUsers.map((connectedUser) => (
                            <ListItem key={connectedUser.id}>
                                <ListItemText
                                    primary={connectedUser.username}
                                    secondary={connectedUser.role}
                                />
                            </ListItem>
                        ))}
                    </List>
                </Box>
            </Drawer>

            <Box component="main" sx={{ flexGrow: 1, p: 3, pt: 8 }}>
                <Container
                    maxWidth="lg"
                    sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <Paper
                        elevation={3}
                        sx={{
                            flexGrow: 1,
                            mb: 2,
                            p: 2,
                            overflow: "auto",
                            maxHeight: "calc(100vh - 250px)",
                        }}
                    >
                        {messages.map((message) => (
                            <Box
                                key={message.id}
                                sx={{
                                    mb: 2,
                                    p: 2,
                                    backgroundColor:
                                        message.username === user?.username
                                            ? "#e3f2fd"
                                            : "#f5f5f5",
                                    borderRadius: 1,
                                }}
                            >
                                <Typography
                                    variant="subtitle2"
                                    color="textSecondary"
                                >
                                    {message.username} -{" "}
                                    {format(
                                        new Date(message.created_at),
                                        "PPpp",
                                        { locale: fr }
                                    )}
                                </Typography>
                                <div
                                    dangerouslySetInnerHTML={{
                                        __html: message.formattedContent,
                                    }}
                                />
                            </Box>
                        ))}
                        <div ref={messagesEndRef} />
                    </Paper>

                    <Paper elevation={3} sx={{ p: 2 }}>
                        <Box sx={{ display: "flex", gap: 2 }}>
                            <ReactQuill
                                value={content}
                                onChange={setContent}
                                modules={modules}
                                style={{ flexGrow: 1 }}
                            />
                            <IconButton
                                color="primary"
                                onClick={handleSend}
                                sx={{ alignSelf: "flex-end", mb: 1 }}
                            >
                                <SendIcon />
                            </IconButton>
                        </Box>
                    </Paper>
                </Container>
            </Box>
        </Box>
    );
}
