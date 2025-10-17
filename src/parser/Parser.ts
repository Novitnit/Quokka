import { LexingResult, QToken } from '../lexer';
import { type Table } from './ParserTable/ActionAndGotoTable';
import { Production } from './ParserTable/types';

interface CSTNode {
    type: string;
    children: (CSTNode | CSTTokenNode)[];
}

interface CSTTokenNode {
    type: string;
    image: string;
    token: QToken;
    StartColumn: number;
    EndColumn: number;
    line: number;
}

interface parserError {
    found: string
    line: number
    startColumn: number
    endColumn: number
    ExpectedTokens: string | string[] | null
}

export class Parser {
    private Table: Table;
    private StateStack: number[] = [0]
    private index = 0
    public parserErrors: parserError[] = []
    private tokens: QToken[] = []
    private cstNode: (CSTNode | CSTTokenNode)[] = [];

    constructor(table: Table | string) {
        this.Table = table as Table
    }

    /**
     * parse the input string
     */
    public parse(input: LexingResult) {
        this.tokens = input.tokens as QToken[]
        let i = 0;
        while (true) {
            const state = this.StateStack[this.StateStack.length - 1] as number;
            const token = this.tokens[this.index];
            if (!token) throw `${this.index} out of bounds ${this.tokens.length}`
            // console.log(this.tokens[0])
            const action = this.Table.ActionTable.get(state)?.get(token.tokenType.tokenIndex);

            if (!action) {
                const expectedTokens = this.getExpectedToken(state, this.Table);
                this.parserErrors.push({
                    found: `${token.image}`,
                    line: token.line,
                    startColumn: token.startColumn,
                    endColumn: token.endColumn,
                    ExpectedTokens: expectedTokens
                })
                while (this.index < this.tokens.length) {
                    const lookaheads = this.tokens[this.index] as QToken;
                    if (this.Table.ActionTable.get(state)?.get(lookaheads.tokenType.tokenIndex)) {
                        break
                    }
                    if (token.tokenType.tokenIndex === -1) {
                        return this.getReturnParser();
                    }
                    this.index++;
                }
                continue;
            }
            switch (action.type) {
                case 'shift': {
                    const tokenNode: CSTTokenNode = {
                        type: token.tokenType.name,
                        image: token.image,
                        StartColumn: token.startColumn,
                        EndColumn: token.endColumn,
                        line: token.line,
                        token: token,
                    }
                    this.cstNode.push(tokenNode)
                    this.StateStack.push(action.to)
                    this.index++
                    break
                }
                case 'reduce': {
                    const prod = this.Table.productions[action.prod] as Production;
                    const popCount = prod.body.length;
                    const children = this.cstNode.splice(
                        this.cstNode.length - popCount,
                        popCount
                    );
                    let finalChildren = children;
                    const newNode: CSTNode = {
                        type: prod.head,
                        children: finalChildren
                    };
                    this.cstNode.push(newNode)

                    for (let i = 0; i < popCount; i++) {
                        this.StateStack.pop();
                    }

                    const gotoState = this.StateStack[this.StateStack.length - 1] as number;
                    const headId = this.Table.nonterminalMap.get(prod.head) as number;
                    const next = this.Table.GotoTable.get(gotoState)?.get(headId);

                    if (next === undefined) {
                        throw new Error(`Goto error: state ${gotoState} head ${prod.head}`);
                    }

                    this.StateStack.push(next);
                    break;
                }
                case "accept": {
                    return this.getReturnParser();
                }
                case 'error': {
                    return this.getReturnParser();
                }
            }

        }
    }

    private getReturnParser() {
        const root = this.cstNode[0] as CSTNode;
        const flattenedRoot = this.flattenMany(root);
        return {
            cst: flattenedRoot,
            errors: this.parserErrors
        }
    }

    private flattenMany(node: CSTNode | CSTTokenNode): CSTNode | CSTTokenNode | null {
        if (!('children' in node)) {
            return node;
        }

        if (node.type.startsWith('MANY_')) {
            const flattenedChildren: (CSTNode | CSTTokenNode)[] = [];
            for (const child of node.children) {
                const flatChild = this.flattenMany(child);
                if (flatChild) {
                    if ('children' in flatChild && flatChild.type.startsWith('MANY_')) {
                        flattenedChildren.push(...flatChild.children);
                    } else {
                        flattenedChildren.push(flatChild);
                    }
                }
            }
            return {
                type: 'MANY_WRAPPER',
                children: flattenedChildren
            } as CSTNode;
        }
        const newChildren: (CSTNode | CSTTokenNode)[] = [];
        for (const child of node.children) {
            const flatChild = this.flattenMany(child);
            if (flatChild) {
                if ('children' in flatChild && flatChild.type === 'MANY_WRAPPER') {
                    newChildren.push(...flatChild.children);
                } else {
                    newChildren.push(flatChild);
                }
            }
        }

        return {
            ...node,
            children: newChildren
        };
    }


    private getExpectedToken(state: number, table: Table): string | string[] | null {
        const actionRow = table.ActionTable.get(state);
        if (!actionRow) return null;
        const expectedTokens: string[] = [];
        for (const [tokenIndex, action] of actionRow.entries()) {
            if (action.type !== 'error') {
                const tokenName = table.TokenMap.get(tokenIndex);
                if (tokenName) {
                    expectedTokens.push(tokenName);
                }
            }
        }
        return expectedTokens.length > 0 ? expectedTokens : null;
    }

}

// table.TokenMap.get(id) ||