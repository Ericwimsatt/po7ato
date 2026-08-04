declare class Tool {
    name: string;
    description: string;
    execute: (params: any, publisherId: string) => Effect<any>;
    constructor(name: string, description: string, execute: (params: any, publisherId: string) => Effect<any>);
}
export { Tool };
//# sourceMappingURL=tool.d.ts.map