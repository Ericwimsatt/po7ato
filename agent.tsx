export class Agent {
    private creator: 'User' | number
    private sessionId: string
    private workspace_root: string

    constructor(sessionId: string, creator: 'User' | number, workspace_root: string) {
        this.creator = creator
        this.sessionId = sessionId
        this.workspace_root = workspace_root
        // choose a model
        // 
        

    
    }

}