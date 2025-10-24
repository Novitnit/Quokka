import { CST, CSTNode, CSTTokenNode, parserError } from "../parser/index.js";

export interface VisitorResult {
    cst: CSTNode | CSTTokenNode;
    errors: parserError[];
    StateStack: number[];
}

export class CSTVisitor {
    private callbacks: Record<string, (...args: any[]) => void> = {};
    private cst: CST;
    private cstOld: CSTNode | CSTTokenNode | null;
    private cstErrors: parserError[] = [];
    private StateStack: number[] = [];
    private OptionCallBack = (node:any) => {return node.children}

    constructor() {
        this.cst = { cst: null, errors: [], StateStack: [] };
        this.cstOld = null;
        this.StateStack = [];
    }

    private replaceChild(parent: CSTNode | undefined, idx: number, result: any) {
        if (!parent) return;
        if (Array.isArray(result)) {
            parent.children.splice(idx, 1, ...result.flat());
        } else if (result && typeof result === "object" && "type" in result) {
            const node = result as CSTNode;
            if (/^OPTION_\d+$/.test(node.type)) {
                parent.children.splice(idx, 1, ...node.children);
            } else {
                parent.children[idx] = result;
            }
        } else {
            parent.children[idx] = result;
        }
    }

    public visit(cst: CST): VisitorResult {
        this.cst = cst;
        this.cstOld = structuredClone(cst.cst);
        this.StateStack = cst.StateStack;
        if (!this.cst.cst) throw new Error("CST is empty");
        if (this.cst.errors.length > 0) this.cstErrors = this.cst.errors;
        return {
            cst: this.traverseIterative(this.cst.cst),
            errors: this.cstErrors,
            StateStack:this.StateStack
        };
    }

    public visitRegister(name: string, callbacks: (...args: any[]) => void): void {
        this.callbacks[name] = callbacks;
    }

    private traverseIterative(root: CSTNode | CSTTokenNode): CSTNode | CSTTokenNode {
        type StackItem = [CSTNode | CSTTokenNode, boolean];
        const stack: StackItem[] = [[root, false]];
        const parentMap = new Map<CSTNode | CSTTokenNode, CSTNode>();
        const childIndexMap = new Map<CSTNode | CSTTokenNode, number>();

        while (stack.length > 0) {
            const [node, visited] = stack.pop()!;
            if (!node) continue;
            if ('children' in node) {
                if (!visited) {
                    stack.push([node, true]);
                    for (let i = node.children.length - 1; i >= 0; i--) {
                        const child = node.children[i];
                        if (!child) continue;
                        parentMap.set(child, node);
                        childIndexMap.set(child, i);
                        stack.push([child, false]);
                    }
                } else {
                    const callback = this.callbacks[node.type];
                    let result;
                    if (callback) {
                        result = callback(node);
                        if (result !== undefined) {
                            const parent = parentMap.get(node);
                            const idx = childIndexMap.get(node)!;
                            this.replaceChild(parent, idx, result);
                        }
                    }else{
                        if(/^OPTION_\d+$/.test(node.type)){
                            result = this.OptionCallBack(node);
                            const parent = parentMap.get(node);
                            const idx = childIndexMap.get(node)!;
                            this.replaceChild(parent, idx, result);
                            continue;
                        }
                        throw new Error(`No visitRegister found for node type: ${node.type}`);
                    }
                }
            }
        }
        return root;
    }
}