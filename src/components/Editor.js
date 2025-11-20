import React, { useEffect, useState, useCallback, useRef } from 'react';
import { auth } from '../firebase-config';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Paper,
  Grid,
  IconButton,
  Snackbar,
  Alert,
} from '@mui/material';
import { styled } from '@mui/system';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import LoadingAnimation from './shared/LoadingAnimation';
import AnimatedButton from './shared/AnimatedButton';

const StyledPaper = styled(Paper)(({ theme }) => ({
  backgroundImage: 'linear-gradient(135deg, rgba(45, 45, 59, 0.6) 0%, rgba(45, 45, 59, 0.9) 100%)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: theme.shape.borderRadius,
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    boxShadow: theme.shadows[8],
  },
}));

const OutputBox = styled(Paper)(({ theme, error }) => ({
  padding: theme.spacing(2),
  flexGrow: 1,
  fontFamily: 'monospace',
  whiteSpace: 'pre-wrap',
  overflow: 'auto',
  backgroundColor: error ? 'rgba(211, 47, 47, 0.1)' : 'rgba(46, 125, 50, 0.1)',
  border: `1px solid ${error ? 'rgba(211, 47, 47, 0.3)' : 'rgba(46, 125, 50, 0.3)'}`,
  borderRadius: theme.shape.borderRadius,
  transition: 'all 0.3s ease-in-out',
}));

const CodeEditor = () => {
  // State
  const [output, setOutput] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', severity: 'info' });
  const [editorReady, setEditorReady] = useState(false);
  
  // Refs
  const editorRef = useRef(null);
  const containerRef = useRef(null);

  // Handle editor initialization
  const handleEditorDidMount = (editor, monaco) => {
    console.log('Editor mounted');
    
    // Store editor reference
    editorRef.current = editor;
    
    // Force set initial content
    const defaultCode = '# Python Code Editor\n# Type your code here\n\nprint("Hello World!")';
    editor.setValue(defaultCode);
    
    // Configure editor
    editor.updateOptions({
      fontSize: 14,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      padding: { top: 16 },
      fixedOverflowWidgets: true,
    });

    // Mark editor as ready
    setTimeout(() => {
      setEditorReady(true);
      console.log('Editor ready');
    }, 500);
  };
  
  // Handle editor resize
  useEffect(() => {
    const handleResize = () => {
      if (editorRef.current && editorReady) {
        editorRef.current.layout();
      }
    };

    let resizeTimeout;
    const observer = new ResizeObserver(() => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = setTimeout(handleResize, 100);
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      observer.disconnect();
    };
  }, []);

  // Handle code execution
  const handleExecuteCode = async () => {
    try {
      // Double check editor state
      const editor = editorRef.current;
      console.log('Execution requested:', { 
        editorReady, 
        hasEditor: !!editor,
        editorValue: editor?.getValue()
      });

      // Wait for editor to be ready if it's not
      if (!editorReady) {
        setNotification({
          show: true,
          message: 'Please wait a few seconds for the editor to initialize...',
          severity: 'info'
        });
        return;
      }

      // Ensure we have an editor reference
      if (!editor) {
        console.error('No editor reference available');
        setNotification({
          show: true,
          message: 'Editor not initialized. Please refresh the page.',
          severity: 'error'
        });
        return;
      }

      // Get the code safely
      let code;
      try {
        code = editor.getValue();
        console.log('Code retrieved:', code.substring(0, 50) + '...');
      } catch (err) {
        console.error('Error accessing editor:', err);
        setNotification({
          show: true,
          message: 'Could not access editor content. Please refresh the page.',
          severity: 'error'
        });
        return;
      }
      if (!code) {
        setNotification({
          show: true,
          message: 'Please enter some code first.',
          severity: 'info'
        });
        return;
      }

      setIsLoading(true);
      setError(null);
      setOutput('Running your code...');

      // Helper: call Piston directly as a fallback
      const executeViaPiston = async (codeContent, language = 'python') => {
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
          const version = languageConfig[language] || '3.10.0';
          const fileName = {
            python: 'main.py',
            javascript: 'main.js',
            typescript: 'main.ts',
            java: 'Main.java',
            cpp: 'main.cpp',
            rust: 'main.rs',
            go: 'main.go'
          }[language] || 'main.py';

          const res = await fetch('https://emkc.org/api/v2/piston/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              language,
              version,
              files: [{ name: fileName, content: codeContent }],
              stdin: ''
            })
          });

          if (!res.ok) {
            const text = await res.text();
            throw new Error(`Piston API returned ${res.status}: ${text}`);
          }

          const result = await res.json();
          const errorOut = result.run?.stderr || result.compile?.stderr || null;
          const outputOut = result.run?.stdout || result.compile?.stdout || '';
          return {
            success: !errorOut && result.run?.code === 0,
            output: outputOut.trim() || 'No output',
            error: errorOut?.trim(),
            language,
            version
          };
        } catch (err) {
          throw err;
        }
      };

      try {
        // Try local server with a short timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        let data;
        try {
          // Attach Firebase ID token if available
          let headers = { 'Content-Type': 'application/json' };
          try {
            const user = auth.currentUser;
            if (user) {
              const idToken = await user.getIdToken();
              headers.Authorization = `Bearer ${idToken}`;
            }
          } catch (e) {
            console.warn('Could not get ID token for local request', e && e.message ? e.message : e);
          }

          const response = await fetch('http://localhost:3001/api/execute', {
            method: 'POST',
            headers,
            body: JSON.stringify({ code, language: 'python', input: '' }),
            signal: controller.signal
          });
          clearTimeout(timeout);

          if (!response.ok) {
            // If server responds with non-OK, fall back to Piston
            console.warn('Local server returned non-OK status', response.status);
            data = await executeViaPiston(code, 'python');
          } else {
            data = await response.json();
          }
        } catch (err) {
          // Network error / timeout -> fallback
          console.warn('Local server unreachable, falling back to Piston:', err.message || err);
          data = await executeViaPiston(code, 'python');
        }

        if (data.error) {
          setError(data.error);
          setOutput('');
          setNotification({ show: true, message: data.error, severity: 'error' });
        } else {
          setError(null);
          setOutput(data.output || 'No output');
          setNotification({ show: true, message: 'Code executed successfully!', severity: 'success' });
        }
      } catch (err) {
        console.error('Execution error (both local and fallback):', err);
        setError(err.message || String(err));
        setNotification({ show: true, message: 'Failed to execute code. Please try again.', severity: 'error' });
      }
    } catch (err) {
      console.error('Execution error:', err);
      setError(err.message);
      setNotification({
        show: true,
        message: 'Failed to execute code. Please try again.',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Python Code Editor
          </Typography>
          <AnimatedButton
            variant="contained"
            color="secondary"
            onClick={handleExecuteCode}
            disabled={isLoading}
            startIcon={<PlayArrowIcon />}
          >
            Run Code
          </AnimatedButton>
        </Toolbar>
      </AppBar>

      <Grid container spacing={2} sx={{ p: 2, flexGrow: 1 }}>
        <Grid item xs={12} md={8}>
          <StyledPaper sx={{ height: '100%' }}>
            <Box ref={containerRef} sx={{ height: '100%', position: 'relative' }}>
              {/* Editor with forced value prop for initialization */}
              <Editor
                height="100%"
                defaultLanguage="python"
                value="# Python Code Editor\n# Type your code here\n\nprint('Hello World!')"
                theme="vs-dark"
                onMount={handleEditorDidMount}
                loading={<LoadingAnimation />}
                options={{
                  readOnly: !editorReady, // Prevent editing until ready
                  fontSize: 14,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  padding: { top: 16 },
                  fixedOverflowWidgets: true,
                }}
                beforeMount={(monaco) => {
                  // Pre-initialize Monaco
                  monaco.editor.defineTheme('custom-dark', {
                    base: 'vs-dark',
                    inherit: true,
                    rules: [],
                    colors: {
                      'editor.background': '#1E1E1E',
                    }
                  });
                }}
              />
            </Box>
          </StyledPaper>
        </Grid>

        <Grid item xs={12} md={4}>
          <StyledPaper sx={{ height: '100%', p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Output
            </Typography>
            <OutputBox error={!!error} sx={{ height: 'calc(100% - 40px)' }}>
              {error || output || 'Code output will appear here...'}
            </OutputBox>
          </StyledPaper>
        </Grid>
      </Grid>

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
  );
};

export default CodeEditor;