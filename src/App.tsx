import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Chat from "./pages/Chat";
import Admin from "./pages/Admin";

const theme = createTheme({
    palette: {
        primary: {
            main: "#2563eb",
        },
        secondary: {
            main: "#4f46e5",
        },
    },
});

function PrivateRoute({
    children,
    adminOnly = false,
}: {
    children: React.ReactNode;
    adminOnly?: boolean;
}) {
    const { user, isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    if (adminOnly && user?.role !== "admin") {
        alert("Access denied: User is not admin");
        return <Navigate to="/chat" />;
    }

    return <>{children}</>;
}

function App() {
    return (
        <ThemeProvider theme={theme}>
            <AuthProvider>
                <Router>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route
                            path="/chat"
                            element={
                                <PrivateRoute>
                                    <Chat />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/admin"
                            element={
                                <PrivateRoute adminOnly>
                                    <Admin />
                                </PrivateRoute>
                            }
                        />
                        <Route path="/" element={<Navigate to="/chat" />} />
                    </Routes>
                </Router>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
