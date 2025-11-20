export const languageOptions = [
    { value: 'python', label: 'Python', icon: '🐍' },
    { value: 'javascript', label: 'JavaScript', icon: '⚡' },
    { value: 'typescript', label: 'TypeScript', icon: '📘' },
    { value: 'java', label: 'Java', icon: '☕' },
    { value: 'cpp', label: 'C++', icon: '⚙️' },
    { value: 'rust', label: 'Rust', icon: '🦀' },
    { value: 'go', label: 'Go', icon: '🐹' }
];

export const themeOptions = [
    { value: 'vs-dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
    { value: 'hc-black', label: 'High Contrast' }
];

export const defaultSettings = {
    fontSize: 14,
    tabSize: 4,
    minimap: true,
    wordWrap: 'on',
    lineNumbers: true,
    renderWhitespace: 'selection',
    snippetSuggestions: 'inline'
};

export const serverConfig = {
    baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:3001',
    wsUrl: process.env.REACT_APP_WS_URL || 'ws://localhost:3001'
};

// Starter templates per language. Keep short, safe examples that execute without input.
export const starterTemplates = {
    python: `# Start coding here
print("Hello, World!")\n`,
    javascript: `// Start coding here
console.log('Hello, World!');\n`,
    typescript: `// Start coding here
const main = (): void => { console.log('Hello, World!'); }\nmain();\n`,
    java: `// Start coding here
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}\n`,
    cpp: `// Start coding here
#include <iostream>
int main() { std::cout << "Hello, World!" << std::endl; return 0; }\n`,
    rust: `// Start coding here
fn main(){ println!("Hello, World!"); }\n`,
    go: `// Start coding here
package main
import "fmt"
func main(){ fmt.Println("Hello, World!") }
`
};