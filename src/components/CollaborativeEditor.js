import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import {
    AppBar, Toolbar, Typography, Button, Drawer, List, ListItem,
    ListItemIcon, ListItemText, TextField, IconButton, Select, MenuItem,
    FormControl, Snackbar, Alert, Box, Paper, CircularProgress,
    Stack, useTheme
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleIcon from '@mui/icons-material/People';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import ShareIcon from '@mui/icons-material/Share';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import { auth } from '../firebase-config';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import axios from 'axios';
import { ThemeProvider } from '@mui/material/styles';
import { languageOptions, defaultSettings, serverConfig, starterTemplates } from '../config/editorConfig';
import { lightTheme, darkTheme } from '../theme/theme';

const LoadingScreen = () => (
    <Box
        sx={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            bgcolor: 'background.default'
        }}
    >
        <CircularProgress size={40} />
        <Typography variant="h6" color="text.primary">
            Initializing Editor...
        </Typography>
    </Box>
);

const CollaborativeEditor = ({ isNew }) => {
    const { id: documentId } = useParams();
    const navigate = useNavigate();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [language, setLanguage] = useState('python');
    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [theme, setTheme] = useState('vs-dark');
    const [users, setUsers] = useState([]);
    const [editorSettings] = useState(defaultSettings);
    const [isExecuting, setIsExecuting] = useState(false);
    const [editorReady, setEditorReady] = useState(false);
    const [firebaseUser, setFirebaseUser] = useState(auth.currentUser || null);
    const [notification, setNotification] = useState({ show: false, message: '', severity: 'info' });
    const [offlineMode, setOfflineMode] = useState(false); // when true, use in-browser mock executor for demo
    const [documentTitle, setDocumentTitle] = useState('');
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    
    const editorRef = useRef(null);
    const ydoc = useRef(null);
    const provider = useRef(null);
    const binding = useRef(null);

    const muiTheme = useTheme();
    const isLight = muiTheme.palette.mode === 'light';

    // Print serverConfig at runtime to verify which API/WS URLs the client is using.
    useEffect(() => {
        try {
            console.log('[Config] serverConfig:', serverConfig);
        } catch (e) {
            console.warn('[Config] serverConfig log failed', e);
        }
    }, []);

    // Health check utilities: checkServer is callable so we can retry from the UI
    const healthCheckRef = useRef(null);
    const checkServer = useCallback(async () => {
        const url = serverConfig.baseUrl || '/';
        try {
            console.log('[HealthCheck] Checking server at', url);
            const resp = await fetch(url, { method: 'GET', mode: 'cors' });
            console.log('[HealthCheck] Response:', resp.status, resp.statusText);
            if (resp.ok) {
                if (offlineMode) {
                    console.log('[HealthCheck] Server reachable; switching out of offline/demo mode');
                    setNotification({ show: true, message: 'Server reachable — using live execution', severity: 'success' });
                }
                setOfflineMode(false);
                return true;
            }
            setNotification({ show: true, message: `Server health check failed: ${resp.status} ${resp.statusText}`, severity: 'warning' });
            setOfflineMode(true);
            return false;
        } catch (err) {
            // Don't loudly alert the user about health-check failures; use console and switch to offline/demo mode silently.
            console.warn('[HealthCheck] Could not reach server (switching to offline/demo):', err && err.message ? err.message : err);
            setOfflineMode(true);
            return false;
        }
    }, [offlineMode]);

    // Run initial check on mount and then retry periodically when offline
    useEffect(() => {
        let intervalId = null;
        (async () => {
            await checkServer();
            if (offlineMode) {
                intervalId = setInterval(() => {
                    checkServer();
                }, 8000);
                healthCheckRef.current = intervalId;
            }
        })();
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [checkServer, offlineMode]);

    const tryLiveServer = useCallback(async () => {
        const ok = await checkServer();
        if (ok) setNotification({ show: true, message: 'Connected to server. Live execution enabled.', severity: 'success' });
    }, [checkServer]);

    // Whether to bypass Firebase auth checks (production deploys only)
    const bypassAuth = process.env.NODE_ENV === 'production';

    // Track Firebase auth state; skip subscribing when bypassing auth in production.
    useEffect(() => {
        if (bypassAuth) {
            console.log('[Auth] Bypassing Firebase auth subscription in production');
            return;
        }

        const unsub = onAuthStateChanged(auth, (user) => {
            setFirebaseUser(user);
            console.log('[Auth] onAuthStateChanged, user:', user ? user.uid : null);
        });
        return () => unsub();
    }, [bypassAuth]);

    // Redirect if isNew
    useEffect(() => {
        if (isNew) {
            const newDocId = 'doc-' + Math.random().toString(36).substr(2, 9);
            navigate(`/documents/${newDocId}`, { replace: true });
        }
    }, [isNew, navigate]);

    // Initialize collaboration: wait for documentId, editor to be mounted, and Firebase auth
    useEffect(() => {
        if (!documentId || !editorReady) {
            // Editor not ready yet; defer until onMount sets editorReady
            setIsLoading(false);
            return;
        }

        
        const attemptsRef = { current: 0 };

        const setupCollaboration = async () => {
            try {
                console.log('Setting up collaboration for document:', documentId);
                
                // Create a new Y.Doc
                const doc = new Y.Doc();
                
                // Auth: if not bypassing, wait for a signed-in Firebase user so we can attach a token to the WS URL.
                // When bypassing auth (production deploy), proceed without waiting and do not attach a token.
                if (!firebaseUser && !bypassAuth) {
                    console.log('[Collab] No signed-in user yet; deferring WS provider until auth is ready');
                    setIsLoading(false);
                    return;
                }

                let wsUrl = serverConfig.wsUrl;
                if (firebaseUser && firebaseUser.getIdToken) {
                    try {
                        const token = await firebaseUser.getIdToken();
                        // Append token as query param
                        const sep = wsUrl.includes('?') ? '&' : '?';
                        wsUrl = `${wsUrl}${sep}token=${encodeURIComponent(token)}`;
                        console.log('[Auth] Appended token to WS URL');
                    } catch (e) {
                        console.warn('[Auth] Could not obtain token for WS provider', e && e.message ? e.message : e);
                        // If we can't get token but are in bypass mode, continue without token. Otherwise abort.
                        if (!bypassAuth) {
                            setIsLoading(false);
                            return;
                        }
                    }
                } else {
                    if (bypassAuth) {
                        console.log('[Collab] Continuing without Firebase token (auth bypass)');
                    }
                }

                // Set up WebSocket connection
                const wsProvider = new WebsocketProvider(
                    wsUrl,
                    documentId,
                    doc,
                    {
                        connect: true,
                        awareness: {
                            clientID: Math.floor(Math.random() * 100000).toString(),
                            name: firebaseUser?.displayName || 'Anonymous',
                            color: `#${Math.floor(Math.random()*16777215).toString(16)}`
                        },
                        WebSocketPolyfill: WebSocket
                    }
                );

                console.log('WebSocket provider created');

                // Set up the shared text type
                const ytext = doc.getText('monaco');

                // Wait for the editor to be ready
                if (editorRef.current) {
                    console.log('Creating Monaco binding');
                    const editor = editorRef.current;
                    const model = editor.getModel();
                    
                    // Create the binding between Monaco and Y.js
                    const binding = new MonacoBinding(
                        ytext,
                        model,
                        new Set([editor]),
                        wsProvider.awareness
                    );

                    // Store refs for cleanup
                    ydoc.current = doc;
                    provider.current = wsProvider;
                    binding.current = binding;

                    // Set up WebSocket status handlers
                    wsProvider.on('status', ({ status }) => {
                        console.log('[WebSocket] Status:', status);
                        if (status === 'connected') {
                            setNotification({
                                show: true,
                                message: 'Connected to collaboration server',
                                severity: 'success'
                            });
                            setIsLoading(false);
                        } else if (status === 'disconnected') {
                            setNotification({
                                show: true,
                                message: 'Lost connection. Attempting to reconnect...',
                                severity: 'warning'
                            });
                        }
                    });

                    // Handle connection errors
                    wsProvider.on('error', (err) => {
                        console.error('WebSocket error:', err);
                        setNotification({
                            show: true,
                            message: 'Connection error. Please try again.',
                            severity: 'error'
                        });
                    });

                    
                } else {
                    console.error('Editor reference not available');
                    throw new Error('Editor not initialized');
                }

                ydoc.current = doc;
                provider.current = wsProvider;

                wsProvider.awareness.setLocalState({
                    user: {
                        name: firebaseUser?.displayName || 'Anonymous',
                        color: `#${Math.floor(Math.random()*16777215).toString(16)}`
                    }
                });

                wsProvider.on('status', ({ status }) => {
                    if (status === 'connected') {
                        setNotification({
                            show: true,
                            message: 'Connected to collaboration server',
                            severity: 'success'
                        });
                        setIsLoading(false);
                    } else {
                        setNotification({
                            show: true,
                            message: 'Connection lost. Trying to reconnect...',
                            severity: 'warning'
                        });
                    }
                });

                wsProvider.on('error', (error) => {
                    console.error('WebSocket error:', error);
                    setNotification({
                        show: true,
                        message: 'Connection error. Please refresh the page.',
                        severity: 'error'
                    });
                    setIsLoading(false);
                });

                const updateUsers = () => {
                    const states = Array.from(wsProvider.awareness.getStates().values());
                    const connectedUsers = states
                        .filter(state => state.user)
                        .map(state => ({
                            name: state.user.name,
                            color: state.user.color
                        }));
                    setUsers(connectedUsers);
                };

                // Some versions/environments expose an awareness object without an 'on' method.
                // Prefer event subscription when available; otherwise fall back to polling.
                const awarenessObj = wsProvider.awareness;
                let awarenessPollId = null;
                try {
                    if (awarenessObj && typeof awarenessObj.on === 'function') {
                        awarenessObj.on('change', updateUsers);
                    } else if (awarenessObj && typeof awarenessObj.getStates === 'function') {
                        // Fallback: poll awareness states every second
                        console.warn('[Collab] awareness.on not available — using polling fallback');
                        awarenessPollId = setInterval(updateUsers, 1000);
                    } else {
                        console.warn('[Collab] awareness object missing expected API; presence may not update');
                    }
                } catch (e) {
                    console.error('[Collab] Error attaching awareness handlers:', e);
                }

                // Save poll id on the provider so cleanup can clear it
                try {
                    if (provider.current && awarenessPollId) provider.current._awarenessPollId = awarenessPollId;
                } catch (e) {
                    /* ignore */
                }

                // Run initial population of users
                updateUsers();
            } catch (error) {
                // Log details for debugging but avoid noisy UI notifications.
                console.error('Failed to initialize collaboration:', error, error && error.stack ? error.stack : 'no stack');
                setIsLoading(false);

                // Retry a few times for transient failures (token race, WS timing)
                try {
                    attemptsRef.current = (attemptsRef.current || 0) + 1;
                    if (attemptsRef.current <= 5) {
                        const backoff = 1000 * attemptsRef.current;
                        console.log(`[Collab] Retry attempt ${attemptsRef.current} in ${backoff}ms`);
                        setTimeout(() => {
                            setupCollaboration();
                        }, backoff);
                    } else {
                        console.warn('[Collab] Max retry attempts reached');
                    }
                } catch (e) {
                    console.error('[Collab] Retry scheduling failed', e);
                }
            }
        };

        setupCollaboration();

        return () => {
            try {
                if (binding.current) {
                    binding.current.destroy();
                    binding.current = null;
                }
            } catch (e) { console.warn('[Cleanup] Error destroying binding', e); }

            try {
                if (provider.current) {
                    // Clear awareness polling fallback if present
                    try {
                        if (provider.current._awarenessPollId) {
                            clearInterval(provider.current._awarenessPollId);
                            provider.current._awarenessPollId = null;
                        }
                    } catch (e) { /* ignore */ }
                    provider.current.destroy();
                    provider.current = null;
                }
            } catch (e) { console.warn('[Cleanup] Error destroying provider', e); }

            try {
                if (ydoc.current) {
                    ydoc.current.destroy();
                    ydoc.current = null;
                }
            } catch (e) { console.warn('[Cleanup] Error destroying ydoc', e); }
        };
    }, [documentId, firebaseUser, editorReady]);

    const handleEditorMount = useCallback((editor) => {
        console.log('[Editor] Mount handler started');
        
        if (!editor) {
            console.error('[Editor] Mount failed: editor instance is null');
            return;
        }
        
        try {
            console.log('[Editor] Got editor instance, initializing...');
            editorRef.current = editor;
            
            // Ensure we have a valid model
            const model = editor.getModel();
            console.log('[Editor] Model check:', model ? 'Model exists' : 'No model');
            
            if (!model) {
                throw new Error('Editor model not available');
            }

            // Set default content if needed
            const currentValue = model.getValue();
            console.log('[Editor] Current content:', currentValue ? 'Has content' : 'Empty');
            
            if (!currentValue) {
                console.log('[Editor] Setting default content');
                model.setValue('# Start coding here\n\nprint("Hello World!")\n');
            }

            if (documentId && ydoc.current && provider.current) {
                console.log('[Editor] Setting up Y.js binding for doc:', documentId);
                const ytext = ydoc.current.getText('monaco');
                binding.current = new MonacoBinding(
                    ytext,
                    model,
                    new Set([editor]),
                    provider.current.awareness
                );
                console.log('[Editor] Y.js binding complete');
            } else {
                console.log('[Editor] Skipping Y.js binding:', {
                    hasDocId: !!documentId,
                    hasYDoc: !!ydoc.current,
                    hasProvider: !!provider.current
                });
            }

            // Mark editor as ready
            setEditorReady(true);
            console.log('[Editor] Initialization complete');
            
            // Setup editor focus and layout
            setTimeout(() => {
                try {
                    editor.focus();
                    editor.layout();
                    console.log('[Editor] Focus and layout applied');
                } catch (layoutError) {
                    console.warn('[Editor] Post-init layout error:', layoutError);
                }
            }, 100);
            
        } catch (error) {
            console.error('[Editor] Initialization failed:', error);
            setNotification({
                show: true,
                message: 'Failed to initialize editor: ' + error.message,
                severity: 'error'
            });
        }
    }, [documentId]);

    const handleExecuteCode = async () => {
        try {
            console.log('[Execute] Starting code execution');
            // Offline/demo fallback: run a simple in-browser executor for JS only
            if (offlineMode) {
                console.log('[Execute] Offline mode enabled — using mock executor');
                setIsExecuting(true);
                setOutput('');
                setError(null);

                const model = editorRef.current && editorRef.current.getModel && editorRef.current.getModel();
                const code = (model ? model.getValue() : '') || '';

                if (!code.trim()) {
                    setNotification({ show: true, message: 'Please enter some code to execute.', severity: 'info' });
                    setIsExecuting(false);
                    return;
                }

                // JavaScript quick eval sandbox (best-effort for demo only)
                if (language === 'javascript') {
                    try {
                        const logs = [];
                        const origLog = console.log;
                        console.log = (...args) => { logs.push(args.join(' ')); };
                        try {
                            // Execute safely using Function constructor
                            // eslint-disable-next-line no-new-func
                            const fn = new Function(code);
                            const result = fn();
                            if (result !== undefined) logs.push(String(result));
                        } finally {
                            console.log = origLog;
                        }
                        const out = logs.join('\n') || 'No output';
                        setOutput(out);
                        setNotification({ show: true, message: 'Executed in demo mode (JS)', severity: 'success' });
                    } catch (e) {
                        setError(String(e));
                        setNotification({ show: true, message: 'Error executing code in demo mode', severity: 'error' });
                    } finally {
                        setIsExecuting(false);
                    }
                    return;
                }

                // Non-JS languages: provide a simulated response
                setTimeout(() => {
                    setOutput(`(Demo) Execution unavailable for ${language}. Showing simulated output.\nHello from demo ${language}!`);
                    setNotification({ show: true, message: `Demo execution completed for ${language}`, severity: 'warning' });
                    setIsExecuting(false);
                }, 800);
                return;
            }
            
            // Check if editor is ready
            if (!editorRef.current || !editorReady) {
                throw new Error('Editor is not ready. Please wait a moment and try again.');
            }

            // Get editor instance and model
            const editor = editorRef.current;
            const model = editor.getModel();
            
            if (!model) {
                throw new Error('Editor is not properly initialized. Please refresh the page.');
            }

            // Get and validate code
            const code = model.getValue().trim();
            if (!code) {
                setNotification({
                    show: true,
                    message: 'Please enter some code to execute.',
                    severity: 'info'
                });
                return;
            }

            setIsExecuting(true);
            setOutput('');
            setError(null);

            console.log('[Execute] Preparing to send request to server or fallback');

            // Helper: call Piston directly as a fallback
            const executeViaPiston = async (codeContent, lang = 'python') => {
                try {
                    const languageConfig = {
                        python: '3.10.0',
                        javascript: '18.15.0',
                        typescript: '5.0.3',
                        java: '15.0.2',
                        cpp: '10.2.0',
                        rust: '1.68.2',
                        go: '1.16.15'
                    };
                    const version = languageConfig[lang] || '3.10.0';
                    const fileName = {
                        python: 'main.py',
                        javascript: 'main.js',
                        typescript: 'main.ts',
                        java: 'Main.java',
                        cpp: 'main.cpp',
                        rust: 'main.rs',
                        go: 'main.go'
                    }[lang] || 'main.py';

                    const res = await axios.post('https://emkc.org/api/v2/piston/execute', {
                        language: lang,
                        version,
                        files: [{ name: fileName, content: codeContent }],
                        stdin: input || ''
                    }, { timeout: 20000 });

                    const result = res.data;
                    const errorOut = result.run?.stderr || result.compile?.stderr || null;
                    const outputOut = result.run?.stdout || result.compile?.stdout || '';
                    return {
                        success: !errorOut && result.run?.code === 0,
                        output: outputOut.trim() || 'No output',
                        error: errorOut?.trim(),
                        language: lang,
                        version
                    };
                } catch (err) {
                    throw err;
                }
            };

            try {
                // Try local server first with short timeout
                // Attempt to obtain Firebase ID token to authenticate local requests and the WS provider.
                let idToken = null;
                try {
                    const user = auth.currentUser;
                    if (user && user.getIdToken) {
                        idToken = await user.getIdToken();
                        console.log('[Auth] Obtained ID token for user');
                    }
                } catch (e) {
                    console.warn('[Auth] Failed to obtain ID token', e && e.message ? e.message : e);
                }
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);

                let response;
                try {
                    const headers = { 'Content-Type': 'application/json' };
                    if (idToken) headers.Authorization = `Bearer ${idToken}`;

                    response = await axios.post(`${serverConfig.baseUrl}/api/execute`, { code, language, input }, {
                        timeout: 5000,
                        validateStatus: false,
                        signal: controller.signal,
                        headers
                    });
                    clearTimeout(timeoutId);
                } catch (err) {
                    console.warn('[Execute] Local server request failed, falling back to Piston:', err && err.message ? err.message : err);
                    // Fallback to Piston
                    const fallback = await executeViaPiston(code, language);
                    if (fallback.error) {
                        setError(fallback.error);
                        setOutput('');
                        setNotification({ show: true, message: fallback.error, severity: 'error' });
                    } else {
                        setOutput(fallback.output || 'No output');
                        setNotification({ show: true, message: 'Code executed via fallback (Piston)', severity: 'success' });
                    }
                    return;
                }

                console.log('[Execute] Server response status:', response.status);
                if (response.status !== 200) {
                    console.warn('[Execute] Server returned non-200, using fallback');
                    const fallback = await executeViaPiston(code, language);
                    if (fallback.error) {
                        setError(fallback.error);
                        setOutput('');
                        setNotification({ show: true, message: fallback.error, severity: 'error' });
                    } else {
                        setOutput(fallback.output || 'No output');
                        setNotification({ show: true, message: 'Code executed via fallback (Piston)', severity: 'success' });
                    }
                    return;
                }

                const { success, output: out, error: execError, language: responseLang, version } = response.data;
                if (execError) {
                    setError(execError);
                    setOutput('');
                    setNotification({ show: true, message: `Code error: ${execError}`, severity: 'error' });
                } else {
                    setOutput(out || 'No output');
                    setNotification({ show: true, message: success ? `Code executed successfully (${responseLang} ${version})` : 'Code executed with warnings', severity: success ? 'success' : 'warning' });
                }
            } catch (err) {
                console.error('[Execute] Both local server and fallback failed:', err);
                setError(err.message || String(err));
                setOutput('');
                setNotification({ show: true, message: 'Failed to execute code. Please try again.', severity: 'error' });
            }
        } catch (error) {
            console.error('[Execute] Error:', error);
            let errorMessage = 'Failed to execute code';
            
            if (error.code === 'ECONNABORTED') {
                errorMessage = 'Server request timed out. Please try again.';
            } else if (error.response) {
                // Prefer server-side message when available
                errorMessage = error.response.data?.error || error.response.statusText || 'Server error';
                console.error('[Execute] Response headers:', error.response.headers);
            } else if (error.request) {
                // The request was made but no response was received
                errorMessage = `Could not reach the server at ${serverConfig.baseUrl}. Check that the dev server is running and reachable from your browser.`;
                // Try an additional health-check to give more info in the console
                try {
                    fetch(serverConfig.baseUrl + '/', { method: 'GET', mode: 'cors' })
                        .then(r => console.log('[Execute HealthCheck] Health check status:', r.status, r.statusText))
                        .catch(e => console.error('[Execute HealthCheck] Health check failed:', e));
                } catch (e) {
                    console.error('[Execute] Health-check attempt failed:', e);
                }
            } else {
                errorMessage = error.message || 'Unknown error occurred';
            }

            setError(errorMessage);
            setOutput(''); // Clear any partial output
            setNotification({
                show: true,
                message: errorMessage,
                severity: 'error'
            });
        } finally {
            setIsExecuting(false);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error('Error signing out:', error);
            setNotification({
                show: true,
                message: 'Failed to sign out',
                severity: 'error'
            });
        }
    };

    const handleShareDocument = () => {
        const shareUrl = window.location.href;
        navigator.clipboard.writeText(shareUrl).then(() => {
            setNotification({
                show: true,
                message: 'Document link copied to clipboard! Share it with others to collaborate.',
                severity: 'success'
            });
        }).catch(() => {
            setNotification({
                show: true,
                message: 'Failed to copy link. Please copy from address bar.',
                severity: 'error'
            });
        });
    };

    const handleNewDocument = () => {
        const newDocId = 'doc-' + Math.random().toString(36).substr(2, 9);
        navigate(`/documents/${newDocId}`);
        window.location.reload(); // Reload to initialize the new document
    };

    const handleTitleChange = (newTitle) => {
        setDocumentTitle(newTitle);
        // You could save this to the database here
        localStorage.setItem(`doc-title-${documentId}`, newTitle);
    };

    // Load document title on mount
    useEffect(() => {
        if (documentId) {
            const savedTitle = localStorage.getItem(`doc-title-${documentId}`);
            setDocumentTitle(savedTitle || `Document: ${documentId.slice(0, 8)}`);
        }
    }, [documentId]);

    if (isLoading) {
        return <LoadingScreen />;
    }

    return (
        <ThemeProvider theme={isLight ? lightTheme : darkTheme}>
            <Box sx={{ display: 'flex', height: '100vh' }}>
                <AppBar position="fixed">
                    <Toolbar>
                        <IconButton
                            edge="start"
                            color="inherit"
                            onClick={() => setDrawerOpen(true)}
                            sx={{ mr: 2 }}
                        >
                            <MenuIcon />
                        </IconButton>

                        <Typography variant="h6" component="div" sx={{ flexGrow: 0, mr: 2 }}>
                            Collaborative Editor
                        </Typography>

                        {/* Document Title */}
                        {isEditingTitle ? (
                            <TextField
                                value={documentTitle}
                                onChange={(e) => handleTitleChange(e.target.value)}
                                onBlur={() => setIsEditingTitle(false)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') setIsEditingTitle(false);
                                }}
                                autoFocus
                                size="small"
                                sx={{
                                    '& .MuiInputBase-input': { color: 'white' },
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                                }}
                            />
                        ) : (
                            <Typography
                                variant="subtitle1"
                                onClick={() => setIsEditingTitle(true)}
                                sx={{
                                    cursor: 'pointer',
                                    opacity: 0.8,
                                    '&:hover': { opacity: 1, textDecoration: 'underline' }
                                }}
                            >
                                {documentTitle}
                            </Typography>
                        )}

                        <Box sx={{ flexGrow: 1 }} />

                        {/* Active Users Indicator */}
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                mr: 2,
                                px: 2,
                                py: 0.5,
                                bgcolor: 'rgba(255,255,255,0.1)',
                                borderRadius: 2,
                                cursor: 'pointer'
                            }}
                            onClick={() => setDrawerOpen(true)}
                        >
                            <PersonIcon sx={{ fontSize: 20, mr: 1 }} />
                            <Typography variant="body2">
                                {users.length} {users.length === 1 ? 'user' : 'users'} online
                            </Typography>
                            {users.slice(0, 3).map((user, idx) => (
                                <Box
                                    key={idx}
                                    sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        bgcolor: user.color,
                                        ml: 1,
                                        border: '1px solid white'
                                    }}
                                />
                            ))}
                        </Box>

                        <Stack direction="row" spacing={1}>
                            <Button
                                color="inherit"
                                startIcon={<AddIcon />}
                                onClick={handleNewDocument}
                                variant="outlined"
                                sx={{ borderColor: 'rgba(255,255,255,0.3)' }}
                            >
                                New
                            </Button>

                            <Button
                                color="inherit"
                                startIcon={<ShareIcon />}
                                onClick={handleShareDocument}
                                variant="outlined"
                                sx={{ borderColor: 'rgba(255,255,255,0.3)' }}
                            >
                                Share
                            </Button>

                            <Button
                                color="inherit"
                                startIcon={theme === 'vs-dark' ? <LightModeIcon /> : <DarkModeIcon />}
                                onClick={() => setTheme(prev => prev === 'vs-dark' ? 'light' : 'vs-dark')}
                            >
                                {theme === 'vs-dark' ? 'Light' : 'Dark'}
                            </Button>
                            
                            <Button
                                color="inherit"
                                onClick={handleLogout}
                                startIcon={<ExitToAppIcon />}
                            >
                                Logout
                            </Button>
                        </Stack>
                    </Toolbar>
                </AppBar>

                <Drawer
                    anchor="left"
                    open={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                >
                    <Box sx={{ width: 300, p: 2 }}>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                            Collaboration Session
                        </Typography>

                        <Paper sx={{ p: 2, mb: 2, bgcolor: 'action.hover' }}>
                            <Typography variant="caption" color="text.secondary">
                                Document ID
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                <Typography variant="body2" sx={{ flexGrow: 1, fontFamily: 'monospace' }}>
                                    {documentId?.slice(0, 12)}...
                                </Typography>
                                <IconButton
                                    size="small"
                                    onClick={handleShareDocument}
                                    title="Copy share link"
                                >
                                    <ContentCopyIcon fontSize="small" />
                                </IconButton>
                            </Box>
                        </Paper>

                        <List>
                            <ListItem sx={{ bgcolor: 'action.hover', borderRadius: 1, mb: 1 }}>
                                <ListItemIcon>
                                    <PeopleIcon color="primary" />
                                </ListItemIcon>
                                <ListItemText 
                                    primary="Active Collaborators" 
                                    secondary={`${users.length} ${users.length === 1 ? 'person' : 'people'} editing`}
                                    primaryTypographyProps={{ fontWeight: 600 }}
                                />
                            </ListItem>
                            {users.length === 0 ? (
                                <ListItem>
                                    <ListItemText 
                                        primary="No other users connected"
                                        secondary="Share the link to invite collaborators"
                                        secondaryTypographyProps={{ variant: 'caption' }}
                                    />
                                </ListItem>
                            ) : (
                                users.map((user, index) => (
                                    <ListItem 
                                        key={index}
                                        sx={{
                                            borderLeft: 3,
                                            borderColor: user.color,
                                            mb: 0.5,
                                            bgcolor: 'background.paper'
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                width: 12,
                                                height: 12,
                                                borderRadius: '50%',
                                                bgcolor: user.color,
                                                mr: 2,
                                                boxShadow: `0 0 8px ${user.color}`
                                            }}
                                        />
                                        <ListItemText 
                                            primary={user.name}
                                            secondary="Active now"
                                            secondaryTypographyProps={{ variant: 'caption', color: 'success.main' }}
                                        />
                                    </ListItem>
                                ))
                            )}
                        </List>

                        <Paper sx={{ p: 2, mt: 2, bgcolor: 'info.light', color: 'info.contrastText' }}>
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                💡 How to Collaborate:
                            </Typography>
                            <Typography variant="caption" component="div" sx={{ mt: 1 }}>
                                • Click "Share" to copy the link
                                <br />
                                • Send it to your team
                                <br />
                                • Edit code together in real-time
                                <br />
                                • See cursor positions & changes live
                            </Typography>
                        </Paper>
                    </Box>
                </Drawer>

                <Box sx={{ display: 'flex', flexGrow: 1, p: 2, gap: 2, mt: 8 }}>
                    <Paper 
                        elevation={0} 
                        sx={{ 
                            flexGrow: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: 1,
                            border: 1,
                            borderColor: 'divider',
                            overflow: 'hidden'
                        }}
                    >
                        <Editor
                            height="100%"
                            defaultLanguage={language}
                            defaultValue={starterTemplates[language] || '// Start coding here\n\n'}
                            theme={theme}
                            onMount={handleEditorMount}
                            loading={<CircularProgress />}
                            options={{
                                readOnly: !documentId,
                                automaticLayout: true,
                                fontSize: editorSettings.fontSize,
                                minimap: { enabled: editorSettings.minimap },
                                wordWrap: editorSettings.wordWrap,
                                lineNumbers: editorSettings.lineNumbers ? 'on' : 'off',
                                tabSize: editorSettings.tabSize,
                                insertSpaces: true,
                                scrollBeyondLastLine: false
                            }}
                        />
                    </Paper>

                    <Paper 
                        elevation={0}
                        sx={{ 
                            width: '30%',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                            p: 2,
                            borderRadius: 1,
                            border: 1,
                            borderColor: 'divider'
                        }}
                    >
                        <FormControl fullWidth>
                            <Select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                variant="outlined"
                            >
                                {languageOptions.map((lang) => (
                                    <MenuItem key={lang.value} value={lang.value}>
                                        {lang.icon} {lang.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            multiline
                            rows={4}
                            variant="outlined"
                            label="Input"
                            placeholder="Enter input values (one per line for multiple inputs)"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            sx={{ bgcolor: 'background.paper' }}
                            helperText="Provide input for programs that use input() or scanf()"
                        />

                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleExecuteCode}
                            disabled={isExecuting}
                            startIcon={<PlayArrowIcon />}
                        >
                            {isExecuting ? 'Executing...' : 'Run Code'}
                        </Button>
                        {offlineMode && (
                            <Button
                                variant="outlined"
                                color="secondary"
                                onClick={tryLiveServer}
                                sx={{ mt: 1 }}
                                disabled={isExecuting}
                            >
                                Try Live Server
                            </Button>
                        )}

                        <TextField
                            multiline
                            rows={8}
                            variant="outlined"
                            label="Output"
                            value={error || output}
                            InputProps={{
                                readOnly: true
                            }}
                            sx={{ bgcolor: 'background.paper' }}
                        />
                    </Paper>
                </Box>

                <Snackbar
                    open={notification.show}
                    autoHideDuration={6000}
                    onClose={() => setNotification(prev => ({ ...prev, show: false }))}
                >
                    <Alert 
                        onClose={() => setNotification(prev => ({ ...prev, show: false }))} 
                        severity={notification.severity}
                        sx={{ width: '100%' }}
                    >
                        {notification.message}
                    </Alert>
                </Snackbar>
            </Box>
        </ThemeProvider>
    );
};

export default CollaborativeEditor;