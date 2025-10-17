import { State } from ".";
import { getTokenMap } from "../../lexer";
import { Production } from "./types";

export interface Table {
    ActionTable:ActionTable
    GotoTable:GotoTable
    TokenMap:Map<number,string>
    States:State[]
    productions:Production[]
    nonterminalMap:Map<string, number>
}

export type Action =
    | { type: "shift"; to: number }
    | { type: 'reduce'; prod: number }
    | { type: 'accept' }
    | { type: 'error' };

type ActionTable = Map<number, Map<number, Action>>;
type GotoTable = Map<number, Map<number, number>>;

export class ActionAndGotoTable {
    private ACTION: ActionTable = new Map();
    private GOTO: GotoTable = new Map();
    private TokenMap:Map<number,string> = new Map()

    constructor(
        private states: State[],
        private productions: Production[],
        private isNonterminal: (sym: number) => boolean,
        private nonterminalMap: Map<string, number>,
    ) {
        this.build();
        this.TokenMap = getTokenMap()
        this.TokenMap.set(-1,"EOF")
    }

    private build() {
        for (let stateIndex = 0; stateIndex < this.states.length; stateIndex++) {
            const state = this.states[stateIndex] as State;

            if (!this.ACTION.has(stateIndex)) this.ACTION.set(stateIndex, new Map());
            if (!this.GOTO.has(stateIndex)) this.GOTO.set(stateIndex, new Map());
            const actionRow = this.ACTION.get(stateIndex)!;
            const gotoRow = this.GOTO.get(stateIndex)!;

            for (const item of state.items) {
                const prod = this.productions[item.productionIdx] as Production;
                const nextSym = item.dot < prod.body.length ? prod.body[item.dot] as number : null;

                if (nextSym !== null) {
                    if (!this.isNonterminal(nextSym)) {
                        const to = state.transitions.get(nextSym);
                        if (to !== undefined) {
                            actionRow.set(nextSym, { type: "shift", to });
                        }
                    }
                } else {
                    if (prod.head === "S'") {
                        for (const la of item.lookaheads) {
                            actionRow.set(la, { type: "accept" });
                        }
                    } else {
                        for (const la of item.lookaheads) {
                            actionRow.set(la, { type: "reduce", prod: item.productionIdx });
                        }
                    }
                }
            }
            for (const [sym, target] of state.transitions.entries()) {
                if (this.isNonterminal(sym)) {
                    gotoRow.set(sym, target);
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
        return this.ACTION.get(state)?.get(terminal) ?? { type: "error" };
    }

    public getGoto(state: number, nonterminal: number): number | undefined {
        return this.GOTO.get(state)?.get(nonterminal);
    }
    
    public dump() {
        console.log("=== ACTION TABLE ===");
        for (const [s, row] of this.ACTION.entries()) {
            for (const [sym, act] of row.entries()) {
                console.log(`state ${s}, sym ${sym}:`, act);
            }
        }
        console.log("=== GOTO TABLE ===");
        for (const [s, row] of this.GOTO.entries()) {
            for (const [sym, to] of row.entries()) {
                console.log(`state ${s}, sym ${sym} -> ${to}`);
            }
        }
    }
}