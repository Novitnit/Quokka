import { State } from "./index.js";
import { getTokenMap } from "../../lexer/index.js";
import { Production } from "./types.js";

export interface Table {
    ActionTable: Record<number, Record<number, Action>>;
    GotoTable: Record<number, Record<number, number>>;
    TokenMap: Record<number, string>;
    States: State[];
    productions: Production[];
    nonterminalMap: Record<string, number>;
}

export type Action =
    | { type: "shift"; to: number }
    | { type: 'reduce'; prod: number }
    | { type: 'accept' }
    | { type: 'error' };

type ActionTable = Record<number, Record<number, Action>>;
type GotoTable = Record<number, Record<number, number>>;

export class ActionAndGotoTable {
    private ACTION: ActionTable = {};
    private GOTO: GotoTable = {};
    private TokenMap:Record<number,string> = {};

    constructor(
        private states: State[],
        private productions: Production[],
        private isNonterminal: (sym: number) => boolean,
        private nonterminalMap: Record<string, number>,
    ) {
        this.build();
        this.TokenMap = getTokenMap()
        this.TokenMap[-1] = "EOF"
    }

    private build() {
        for (let stateIndex = 0; stateIndex < this.states.length; stateIndex++) {
            const state = this.states[stateIndex] as State;

            if (!this.ACTION[stateIndex]) this.ACTION[stateIndex] = {};
            if (!this.GOTO[stateIndex]) this.GOTO[stateIndex] = {};
            const actionRow = this.ACTION[stateIndex] as Record<number, Action>;
            const gotoRow = this.GOTO[stateIndex] as Record<number, number>;

            for (const item of state.items) {
                const prod = this.productions[item.productionIdx] as Production;
                const nextSym = item.dot < prod.body.length ? prod.body[item.dot] as number : null;

                if (nextSym !== null) {
                    if (!this.isNonterminal(nextSym)) {
                        const to = state.transitions.get(nextSym);
                        if (to !== undefined) {
                            actionRow[nextSym] = { type: "shift", to };
                        }
                    }
                } else {
                    if (prod.head === "S'") {
                        for (const la of item.lookaheads) {
                            actionRow[la] = { type: "accept" };
                        }
                    } else {
                        for (const la of item.lookaheads) {
                            actionRow[la] = { type: "reduce", prod: item.productionIdx };
                        }
                    }
                }
            }
            for (const [sym, target] of state.transitions.entries()) {
                if (this.isNonterminal(sym)) {
                    gotoRow[sym] = target;
                }
            }
        }
    }

    public getTable():Table{
        return {
            ActionTable:this.ACTION,
            GotoTable:this.GOTO,
            nonterminalMap:this.nonterminalMap,
            productions:this.productions,
            States:this.states,
            TokenMap:this.TokenMap
        }
    }

    public getAction(state: number, terminal: number): Action {
        return this.ACTION[state]?.[terminal] ?? { type: "error" };
    }

    public getGoto(state: number, nonterminal: number): number | undefined {
        return this.GOTO[state]?.[nonterminal];
    }
    
    public dump() {
        console.log("=== ACTION TABLE ===");
        for (const [s, row] of Object.entries(this.ACTION)) {
            for (const [sym, act] of Object.entries(row)) {
                console.log(`state ${s}, sym ${sym}:`, act);
            }
        }
        console.log("=== GOTO TABLE ===");
        for (const [s, row] of Object.entries(this.GOTO)) {
            for (const [sym, to] of Object.entries(row)) {
                console.log(`state ${s}, sym ${sym} -> ${to}`);
            }
        }
    }
}