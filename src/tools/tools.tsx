export type tools = 
    | { name: "edit-file", description: "Edit a file in the project",
        parameters: { filePath: string, newContent: string } }
    | { name: "read-file", description: "Read a file in the project",
        parameters: { filePath: string } }
    | { name: "list-files", description: "List all files in the project",
        parameters: {} }
    | { name: "run-command", description: "Run a command in the terminal",
        parameters: { command: string } }
    | { name: "get-user-input", description: "Get user input from the terminal",
        parameters: { questions: string[] } }