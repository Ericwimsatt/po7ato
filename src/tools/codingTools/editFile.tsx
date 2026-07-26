import { Tool } from "../tool";

const editFile = (params: { filePath: string}, publisherId: string) => {
    // edit the file at filePath
    // Copy implementation details from OpenCode for now
}

const editFileTool = new Tool(
    "edit-file",
    "Edit a file in the project",
    editFile
)

export { editFileTool }