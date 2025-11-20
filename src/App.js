import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CollaborativeEditor from './components/CollaborativeEditor';
import Auth from './components/Auth';
import Home from './components/Home';
import PrivateRoute from './components/PrivateRoute';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { darkTheme } from './theme/theme';
import './App.css';
import './firebase-config';

function App() {
  const isProd = process.env.NODE_ENV === 'production';

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* In production deployments, load the editor directly at `/` without requiring login. */}
          <Route path="/" element={isProd ? <CollaborativeEditor isNew={true} /> : <Home />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/signup" element={<Auth />} />
          <Route
            path="/documents/new"
            element={
              <PrivateRoute>
                <CollaborativeEditor isNew={true} />
              </PrivateRoute>
            }
          />
          <Route
            path="/documents/:id"
            element={
              <PrivateRoute>
                <CollaborativeEditor />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
