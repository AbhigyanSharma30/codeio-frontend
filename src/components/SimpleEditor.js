import React, { useRef, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { Box, Button, Container, Paper, Typography } from '@mui/material';

const MIN_EDITOR_HEIGHT = '400px';
const DEFAULT_PYTHON_CODE = `# Write your Python code here
print("Hello, World!")
`;

const CodeEditor = () => {
    const editorRef = useRef(null);
    const [output, setOutput] = useState('');
    const [isRunning, setIsRunning] = useState(false);

    const handleEditorMount = (editor) => {
        console.log("Editor mounted successfully");
        editorRef.current = editor;
        
        // Set initial content
        editor.setValue(DEFAULT_PYTHON_CODE);
        
        // Focus the editor
        editor.focus();
    };

    const runCode = async () => {
        if (!editorRef.current) {
            console.error("Editor not ready");
            return;
        }

        try {
            setIsRunning(true);
            setOutput('Running code...');

            const code = editorRef.current.getValue();
            const response = await fetch('http://localhost:3001/api/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code,
                    language: 'python'
                })
            });

            const result = await response.json();
            setOutput(result.output || result.error || 'No output');
        } catch (error) {
            setOutput('Error: ' + (error.message || 'Failed to run code'));
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            {/* Editor Container */}
            <Paper 
                elevation={3} 
                sx={{ 
                    p: 2, 
                    bgcolor: '#1e1e1e',
                    minHeight: MIN_EDITOR_HEIGHT,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2
                }}
            >
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ color: '#fff' }}>
                        Python Code Editor
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={runCode}
                        disabled={isRunning}
                    >
                        {isRunning ? 'Running...' : 'Run Code'}
                    </Button>
                </Box>

                {/* Editor */}
                <Box sx={{ 
                    flexGrow: 1, 
                    minHeight: MIN_EDITOR_HEIGHT,
                    border: '1px solid #333',
                    borderRadius: 1,
                    overflow: 'hidden'
                }}>
                    <MonacoEditor
                        height="100%"
                        defaultLanguage="python"
                        theme="vs-dark"
                        options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            lineNumbers: 'on',
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            wordWrap: 'on'
                        }}
                        onMount={handleEditorMount}
                    />
                </Box>

                {/* Output */}
                <Paper 
                    elevation={2}
                    sx={{
                        p: 2,
                        bgcolor: '#2d2d2d',
                        color: '#fff',
                        fontFamily: 'monospace',
                        minHeight: '100px',
                        maxHeight: '200px',
                        overflow: 'auto'
                    }}
                >
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                        {output || 'Code output will appear here...'}
                    </pre>
                </Paper>
            </Paper>
        </Container>
    );
};

export default CodeEditor;