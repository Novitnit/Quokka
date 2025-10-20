import { parserError } from "../parser";
import { Action, Table } from "../parser/ParserTable/ActionAndGotoTable";
import { Production } from "../parser/ParserTable/types";

interface AutoCompleteCtx {
    Table: string | Table;
    ParserErrors: parserError[];
    stateStack: number[];
}

export class AutoComplete {
    private Table: Table;
    private ParserErrors: parserError[];
    private tokenSuggestMap: Map<string, string[]> = new Map();
    private StateStack: number[] = [];

    constructor(AutoCompleteCtx: AutoCompleteCtx) {
        this.Table = typeof AutoCompleteCtx.Table === "string" ? JSON.parse(AutoCompleteCtx.Table) as Table : AutoCompleteCtx.Table;
        this.ParserErrors = AutoCompleteCtx.ParserErrors;
        this.StateStack = AutoCompleteCtx.stateStack;
    }

    public suggestFromError(): string[] {
        const firstError = this.ParserErrors[0];
        if (!firstError) return [];
        const expected = firstError.ExpectedTokens;
        if (Array.isArray(expected)) {
            return expected.flatMap(token => this.tokenToSuggestions(token));
        } else if (typeof expected === "string") {
            return this.tokenToSuggestions(expected);
        } else {
            return [];
        }
    }

    public suggestFromState(): string[] {
        const stateIndex = this.StateStack.length > 1
            ? this.StateStack.length - 2
            : this.StateStack.length - 1;
        const state = this.StateStack[stateIndex] as number;
        const actions = this.Table.ActionTable[state];
        if (!actions) return [];

        const suggestions: string[] = [];

        for (const [tokenIdxStr, action] of Object.entries(actions)) {
            const tokenIdx = Number(tokenIdxStr);
            const actionObj = action as Action;

            if (actionObj.type === "shift") {
                const tokenName = this.Table.TokenMap[tokenIdx];
                if (!tokenName) continue;

                const tokenSuggestions = this.tokenToSuggestions(tokenName);
                suggestions.push(...tokenSuggestions);
            }

            if (actionObj.type === "reduce") {
                const prod = this.Table.productions[actionObj.prod] as Production;
                const fakeStack = [state];
                const popped = prod.body.length;
                fakeStack.splice(fakeStack.length - popped, popped);
                const fakeStackIndex = fakeStack.length - 1 as number;
                const headIdx = this.Table.nonterminalMap[prod.head] as number;
                const gotoState = this.Table.GotoTable[fakeStack[fakeStackIndex] as number]?.[headIdx];

                if (gotoState !== undefined) {
                    const gotoActions = this.Table.ActionTable[gotoState];
                    if(!gotoActions) continue;
                    for (const [tokenIdxStr, nextAction] of Object.entries(gotoActions)) {
                        if (nextAction.type === "shift") {
                            const tokenIdx = parseInt(tokenIdxStr);
                            const tokenName = this.Table.TokenMap[tokenIdx];
                            this.tokenToSuggestions(tokenName as string).forEach(s => suggestions.push(s));
                        }
                    }
                }
            }
        }

        return suggestions;
    }

    public setTokenSuggestMap({ name, suggestions }: { name: string, suggestions: string[] | null }) {
        if (suggestions === null) {
            this.tokenSuggestMap.set(name, [name])
            return;
        }
        this.tokenSuggestMap.set(name, suggestions);
    }

    public tokenToSuggestions(TokenName: string): string[] {
        const suggestions = this.tokenSuggestMap.get(TokenName);
        if (!suggestions) throw new Error(`No suggestions found for token: ${TokenName}`);
        return suggestions;
    }

}