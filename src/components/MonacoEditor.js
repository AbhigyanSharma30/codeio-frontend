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
    Tooltip, Divider, useTheme, Stack
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleIcon from '@mui/icons-material/People';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { auth } from '../firebase-config';
import { signOut } from 'firebase/auth';
import axios from 'axios';
import { languageOptions, themeOptions, defaultSettings, serverConfig, starterTemplates } from '../config/editorConfig';
import { lightTheme, darkTheme } from '../theme/theme';
import { createTheme, ThemeProvider } from '@mui/material/styles';


const MonacoEditor = () => {
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
    const [editorSettings, setEditorSettings] = useState(defaultSettings);
    const [isExecuting, setIsExecuting] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [notification, setNotification] = useState({ show: false, message: '', severity: 'info' });
    const [currentDocument, setCurrentDocument] = useState({ title: 'Untitled', lastSaved: null });
    
    const muiTheme = useTheme();
    const isLight = theme === 'light';
    
    // References
    const editorRef = useRef(null);
    const ydoc = useRef(null);
    const provider = useRef(null);
    const binding = useRef(null);

    // Initialize YJS and Monaco Editor
    useEffect(() => {
        if (!documentId) return;

    // Initialize YJS document
    ydoc.current = new Y.Doc();
    const websocketUrl = process.env.REACT_APP_WS_URL || serverConfig.wsUrl || 'ws://localhost:3001';
    provider.current = new WebsocketProvider(websocketUrl, documentId, ydoc.current);

        // Handle connection status
        provider.current.on('status', event => {
            if (event.status === 'connected') {
                setError(null);
            } else {
                setError('Connection lost. Trying to reconnect...');
            }
        });

        // Handle awareness updates (connected users)
        provider.current.awareness.on('change', () => {
            const states = Array.from(provider.current.awareness.getStates().values());
            const connectedUsers = states
                .filter(state => state.user)
                .map(state => state.user.name);
            setUsers(connectedUsers);
        });

        // Cleanup
        return () => {
            provider.current?.destroy();
            ydoc.current?.destroy();
        };
    }, [documentId]);

    // Handle Monaco Editor mount
    const handleEditorMount = useCallback((editor, monaco) => {
        editorRef.current = editor;
        setIsLoading(false);

        if (!ydoc.current || !provider.current) return;

        const ytext = ydoc.current.getText('monaco');
        binding.current = new MonacoBinding(
            ytext, 
            editorRef.current.getModel(), 
            new Set([editorRef.current]), 
            provider.current.awareness
        );

        // Set up awareness handling for cursor positions
        provider.current.awareness.setLocalState({
            user: {
                name: auth.currentUser?.displayName || 'Anonymous',
                color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
            }
        });
    }, []);

    // Execute code
    const handleExecuteCode = async () => {
        try {
            setIsExecuting(true);
            setOutput('');
            setError(null);
            
            // Get the code from editor
            const code = editorRef.current.getValue();
            if (!code.trim()) {
                setNotification({
                    show: true,
                    message: 'Please enter some code to execute',
                    severity: 'warning'
                });
                return;
            }

            const response = await axios.post(`${serverConfig.baseUrl}/api/execute`, {
                code,
                language,
                input
            });

            const result = response.data;
            
            // Handle compilation errors
            if (result.compile?.stderr) {
                setError(`Compilation Error: ${result.compile.stderr}`);
                return;
            }

            // Handle runtime output
            if (result.run) {
                let output = '';
                if (result.run.stdout) output += result.run.stdout;
                if (result.run.stderr) output += `\nError: ${result.run.stderr}`;
                setOutput(output.trim());
                
                if (result.run.code !== 0) {
                    setNotification({
                        show: true,
                        message: 'Program exited with non-zero status',
                        severity: 'warning'
                    });
                }
            }
        } catch (err) {
            console.error('Execution error:', err);
            setError(err.response?.data?.error || 'Failed to execute code');
            setNotification({
                show: true,
                message: 'Failed to execute code. Please try again.',
                severity: 'error'
            });
        } finally {
            setIsExecuting(false);
        }
    };

    // Handle language change
    const handleLanguageChange = (event) => {
        setLanguage(event.target.value);
    };

    return (
        <ThemeProvider theme={isLight ? lightTheme : darkTheme}>
            <Box sx={{ 
                height: '100vh', 
                display: 'flex', 
                flexDirection: 'column',
                bgcolor: 'background.default'
            }}>
                <AppBar position="static" elevation={0} color="default">
                    <Toolbar sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <IconButton
                            edge="start"
                            color="inherit"
                            onClick={() => setDrawerOpen(!drawerOpen)}
                        >
                            <MenuIcon />
                        </IconButton>
                        <Typography variant="h6" style={{ flexGrow: 1 }}>
                            Collaborative Code Editor
                        </Typography>
                        <FormControl variant="outlined" size="small" style={{ width: 150, marginRight: 20 }}>
                            <Select
                                value={language}
                                onChange={handleLanguageChange}
                                style={{ color: 'white', borderColor: 'white' }}
                            >
                                <MenuItem value="python">Python</MenuItem>
                                <MenuItem value="javascript">JavaScript</MenuItem>
                                <MenuItem value="java">Java</MenuItem>
                                <MenuItem value="cpp">C++</MenuItem>
                                <MenuItem value="typescript">TypeScript</MenuItem>
                                <MenuItem value="rust">Rust</MenuItem>
                                <MenuItem value="go">Go</MenuItem>
                            </Select>
                        </FormControl>
                        <IconButton 
                            color="inherit" 
                            onClick={() => setTheme(theme === 'vs-dark' ? 'light' : 'vs-dark')}
                        >
                            {theme === 'vs-dark' ? '🌙' : '☀️'}
                        </IconButton>
                        <Button
                            color="inherit"
                            onClick={() => {
                                signOut(auth).then(() => {
                                    navigate('/');
                                });
                            }}
                        >
                            <ExitToAppIcon />
                            Logout
                        </Button>
                    </Toolbar>
                </AppBar>

                <div style={{ flexGrow: 1, display: 'flex' }}>
                    <Drawer
                        variant="persistent"
                        anchor="left"
                        open={drawerOpen}
                        PaperProps={{
                            style: {
                                width: 240,
                                backgroundColor: theme === 'vs-dark' ? '#1e1e1e' : '#ffffff'
                            }
                        }}
                    >
                        <List>
                            <ListItem>
                                <ListItemIcon>
                                    <PeopleIcon />
                                </ListItemIcon>
                                <ListItemText primary="Connected Users" />
                            </ListItem>
                            {users.map((user, index) => (
                                <ListItem key={index}>
                                    <ListItemText 
                                        primary={user}
                                        sx={{
                                            color: theme === 'vs-dark' ? '#ffffff' : '#000000'
                                        }}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Drawer>

                    <div style={{ flex: '70%', position: 'relative' }}>
                        <Editor
                            height="100%"
                            defaultLanguage={language}
                            language={language}
                            defaultValue={starterTemplates[language] || (language === 'python' ? '# Start coding here\n\n' : '// Start coding here\n\n')}
                            theme={theme}
                            onMount={handleEditorMount}
                            loading={<div>Loading editor...</div>}
                            options={{
                                minimap: { enabled: true },
                                fontSize: 14,
                                wordWrap: 'on',
                                automaticLayout: true,
                                formatOnPaste: true,
                                formatOnType: true,
                                suggestOnTriggerCharacters: true,
                                tabSize: 4,
                                scrollBeyondLastLine: false,
                                renderWhitespace: 'selection',
                                bracketPairColorization: true,
                                autoIndent: 'full',
                                dragAndDrop: true,
                                links: true,
                                mouseWheelZoom: true,
                            }}
                        />
                    </div>

                    <div style={{ 
                        flex: '30%', 
                        padding: '20px',
                        backgroundColor: theme === 'vs-dark' ? '#1e1e1e' : '#f3f3f3',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px'
                    }}>
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            variant="outlined"
                            label="Input"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            sx={{
                                backgroundColor: theme === 'vs-dark' ? '#2d2d2d' : '#ffffff',
                                '& .MuiInputBase-input': {
                                    color: theme === 'vs-dark' ? '#ffffff' : '#000000'
                                }
                            }}
                        />

                        <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            onClick={handleExecuteCode}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Executing...' : 'Run Code'}
                        </Button>

                        <TextField
                            fullWidth
                            multiline
                            rows={8}
                            variant="outlined"
                            label="Output"
                            value={output}
                            InputProps={{
                                readOnly: true,
                            }}
                            sx={{
                                backgroundColor: theme === 'vs-dark' ? '#2d2d2d' : '#ffffff',
                                '& .MuiInputBase-input': {
                                    color: theme === 'vs-dark' ? '#ffffff' : '#000000',
                                    fontFamily: 'monospace'
                                }
                            }}
                        />
                    </div>
                </div>

                <Snackbar 
                    open={!!error} 
                    autoHideDuration={6000} 
                    onClose={() => setError(null)}
                >
                    <Alert severity="error" onClose={() => setError(null)}>
                        {error}
                    </Alert>
                </Snackbar>
            </Box>
        </ThemeProvider>
    );
};

export default MonacoEditor;