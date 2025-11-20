import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { auth } from '../firebase-config';
import { onAuthStateChanged } from 'firebase/auth';
import { Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material'; // Changed import

const PrivateRoute = ({ children }) => {
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Bypass auth checks in production (deployment).
    const bypassAuth = process.env.NODE_ENV === 'production';

    useEffect(() => {
        if (bypassAuth) {
            // Immediately allow access in production builds so the app can be used
            // as a frontend-only deployment without waiting for Firebase.
            setIsAuthenticated(true);
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setIsAuthenticated(true);
            } else {
                setIsAuthenticated(false);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [bypassAuth]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#121212' }}>
                <CircularProgress />
            </Box>
        );
    }

    return isAuthenticated ? children : <Navigate to="/login" state={{ from: location }} />;
};

export default PrivateRoute;
