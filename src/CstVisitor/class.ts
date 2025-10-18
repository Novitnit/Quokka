import { CST, CSTNode, CSTTokenNode } from "../parser";

export class CSTVisitor {

    private callbacks: Record<string, (...args: any[]) => void> = {};
    private cst: CST;
    private cstOld: CSTNode | CSTTokenNode | null;

    constructor(cst: CST) {
        this.cst = cst;
        this.cstOld = structuredClone(cst.cst);
    }

    public visit() {
        if (!this.cst.cst) throw new Error("CST is empty");
        return this.traverseIterative(this.cst.cst);
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
                    if (callback) {
                        const result = callback(node);
                        if (result !== undefined) {
                            const parent = parentMap.get(node);
                            if (parent) {
                                const idx = childIndexMap.get(node)!;
                                parent.children[idx] = result;
                            } else {
                                return result;
                            }
                        }
                    }else{
                        throw new Error(`No visitRegister found for node type: ${node.type}`);
                    }
                }
            }
        }
        return root;
    }
}