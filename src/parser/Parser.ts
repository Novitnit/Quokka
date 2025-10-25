import { LexingResult, QToken } from "../lexer/index.js";
import { getGroupNameByTokenIndex } from "../lexer/token.js";
import { type Table } from "./ParserTable/ActionAndGotoTable.js";
import { Production } from "./ParserTable/types.js";

export interface CSTNode {
    CstType: "Node";
    type: string;
    children: (CSTNode | CSTTokenNode)[];
}

export interface CST {
    cst: CSTNode | CSTTokenNode | null;
    errors: parserError[];
    StateStack: number[];
}
export interface CSTTokenNode {
    CstType: "TokenNode";
    type: string;
    image: string;
    tokenIdx: number;
    startColumn: number;
    endColumn: number;
    startOffset: number;
    endOffset: number;
    line: number;
}

export interface parserError {
    found: string
    line: number
    startColumn: number
    endColumn: number
    Expected: string[];
    ExpectedAllTokens: string[];
}

export interface SuggestResult {
    state: number;
    expected: string[];
    expectedAllTokens: string[];
    index: number;
}

export class Parser {
    public Table: Table;
    private StateStack: number[] = [0]
    private index = 0
    public parserErrors: parserError[] = []
    private tokens: QToken[] = []
    private cstNode: (CSTNode | CSTTokenNode)[] = [];

    constructor(table: Table | string) {
        this.Table = typeof table === 'string' ? JSON.parse(table) as Table : table;
    }

    public parse(input: LexingResult): CST {
        return this.internalParse(input, { suggest: false }) as CST;
    }

    public suggestParse(input: LexingResult): SuggestResult {
        if (input.tokens.length > 0 && (input.tokens[input.tokens.length - 1] as QToken).tokenType.tokenIndex === -1) {
            input.tokens = input.tokens.slice(0, -1);
        }
        return this.internalParse(input, { suggest: true }) as SuggestResult;
    }

    private internalParse(input: LexingResult, options: { suggest: boolean }): CST | SuggestResult {
        this.StateStack = [0];
        this.index = 0;
        this.cstNode = [];
        this.parserErrors = [];
        this.tokens = input.tokens as QToken[]
        let i = 0;
        while (true) {
            const state = this.StateStack[this.StateStack.length - 1] as number;
            const token = this.tokens[this.index];


            if (!token) {
                if (options.suggest) {
                    const sep = this.getExpectedTokenSeparated(state, this.Table);
                    return {
                        state,
                        expected: this.getExpectedToken(state, this.Table) ?? [],
                        expectedAllTokens: sep?.tokens ?? [],
                        index: this.index
                    }
                } else {
                    throw `${this.index} out of bounds ${this.tokens.length - 1}`
                }
            }


            const action = this.Table.ActionTable[state]?.[token.tokenType.tokenIndex];

            if (!action) {
                const expectedTokens = this.getExpectedToken(state, this.Table);
                const sep = this.getExpectedTokenSeparated(state, this.Table);
                if (options.suggest) {
                    return {
                        state,
                        index: this.index,
                        expected: expectedTokens ?? [],
                        expectedAllTokens: sep?.tokens ?? []
                    };
                }
                this.parserErrors.push({
                    found: `${token.image}`,
                    line: token.line,
                    startColumn: token.startColumn,
                    endColumn: token.endColumn,
                    Expected: expectedTokens ?? [],
                    ExpectedAllTokens: sep?.tokens ?? []
                })
                while (this.index < this.tokens.length) {
                    const lookaheads = this.tokens[this.index] as QToken;
                    if (this.Table.ActionTable[state]?.[lookaheads.tokenType.tokenIndex]) {
                        break
                    }
                    if (token.tokenType.tokenIndex === -1) {
                        return this.getReturnParser();
                    }
                    this.index++;
                    if (this.index >= this.tokens.length) {
                        return this.getReturnParser();
                    }
                }
                continue;
            }
            switch (action.type) {
                case 'shift': {
                    const tokenNode: CSTTokenNode = {
                        CstType: "TokenNode",
                        type: token.tokenType.name,
                        image: token.image,
                        startColumn: token.startColumn,
                        endColumn: token.endColumn,
                        startOffset: token.startOffset,
                        endOffset: token.endOffset,
                        line: token.line,
                        tokenIdx: token.tokenType.tokenIndex
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
                        CstType: "Node",
                        type: prod.head,
                        children: finalChildren
                    };
                    this.cstNode.push(newNode)

                    for (let i = 0; i < popCount; i++) {
                        this.StateStack.pop();
                    }

                    const gotoState = this.StateStack[this.StateStack.length - 1] as number;
                    const headId = this.Table.nonterminalMap[prod.head] as number;
                    const next = this.Table.GotoTable[gotoState]?.[headId];

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

    private getReturnParser(): CST {
        const root = this.cstNode[0] as CSTNode;
        if (this.cstNode.length === 0) {
            return {
                cst: null,
                errors: this.parserErrors,
                StateStack: this.StateStack,
            };
        }
        const flattenedRoot = this.flattenMany(root);
        return {
            cst: flattenedRoot,
            errors: this.parserErrors,
            StateStack: this.StateStack,
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


    private getExpectedToken(state: number, table: Table): string[] | null {
        const actionRow = table.ActionTable[state];
        if (!actionRow) return null;
        const groups = new Set<string>();
        const tokensNotInGroup = new Set<string>();
        for (const [tokenIndexStr, action] of Object.entries(actionRow)) {
            if (action.type === 'error') continue;
            const idx = Number(tokenIndexStr);
            const groupName = getGroupNameByTokenIndex(idx);
            if (groupName) {
                groups.add(groupName);
            } else {
                const tokenName = table.TokenMap[idx];
                if (tokenName) tokensNotInGroup.add(tokenName);
            }
        }
        const finalList = [...groups, ...tokensNotInGroup];
        return finalList.length ? finalList : null;
    }

    private getExpectedTokenSeparated(state: number, table: Table): { groups: string[]; tokens: string[]; tokensNotInGroup: string[] } | null {
        const actionRow = table.ActionTable[state];
        if (!actionRow) return null;
        const groupNames = new Set<string>();
        const tokenNames = new Set<string>();
        const tokenNamesNoGroup = new Set<string>();
        for (const [tokenIndexStr, action] of Object.entries(actionRow)) {
            if (action.type === 'error') continue;
            const idx = Number(tokenIndexStr);
            const groupName = getGroupNameByTokenIndex(idx);
            const tokenName = table.TokenMap[idx];
            if (groupName) {
                groupNames.add(groupName);
            } else if (tokenName) {
                tokenNamesNoGroup.add(tokenName);
            }
            if (tokenName) tokenNames.add(tokenName);
        }
        if (groupNames.size === 0 && tokenNames.size === 0) return null;
        return { groups: Array.from(groupNames), tokens: Array.from(tokenNames), tokensNotInGroup: Array.from(tokenNamesNoGroup) };
    }

}