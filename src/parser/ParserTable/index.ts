import { Rule } from "../Rule";
import { Production } from "./types";
import { Item, createItemsFromProductions, itemsKey } from "./Item";
import { closure, goto } from "./ClosureGoto";
import { buildProductions } from "./buildProductions";
import { ActionAndGotoTable } from "./ActionAndGotoTable";

export type State = {
    items: Item[]
    transitions: Map<number, number>
}

export class ParserTable {
    private Productions: Production[] = [];
    private Items: Item[] = [];
    private nonterminalMap: Record<string, number> = {};
    private reverseNonterminalMap: Record<number, string> = {};
    private States: State[] = [];
    private actionGotoTable: ActionAndGotoTable;

    constructor(rule: Rule) {
        this.buildProductions(rule);
        this.buildReverseNonterminalMap();
        this.addAugmentedProduction(rule.name);
        this.Items = createItemsFromProductions(this.Productions);
        this.buildStates();

        this.actionGotoTable = new ActionAndGotoTable(
            this.States,
            this.Productions,
            this.isNonterminal.bind(this),
            this.nonterminalMap,
        );
    }

    public getTable() {
        return this.actionGotoTable.getTable()
    }

    private buildProductions(rule: Rule) {
        const bP = new buildProductions(rule);
        this.Productions = bP.getProductions();
        this.nonterminalMap = bP.getnonterminalMap();
    }

    private addAugmentedProduction(startName: string) {
        const originalStartIdx = Number(
            Object.keys(this.reverseNonterminalMap)
                .find(key => this.reverseNonterminalMap[Number(key)] === startName)
        );
        this.Productions.unshift({ head: "S'", body: [originalStartIdx] });
        this.reverseNonterminalMap[99999] = "S'";
    }

    private buildStates() {
        const startItem = this.Items.find(i => i.productionIdx === 0 && i.dot === 0)!;
        startItem.lookaheads.add(-1);
        const startClosure = closure(
            [startItem],
            this.Productions,
            this.reverseNonterminalMap,
            this.firstOfSequence.bind(this),
            this.canBeEmpty.bind(this),
            this.isNonterminal.bind(this)
        );
        this.States.push({ items: startClosure, transitions: new Map() });
        const queue: number[] = [0];
        const seen: string[] = [itemsKey(startClosure)];
        while (queue.length) {
            const stateIdx = queue.shift()!;
            const state = this.States[stateIdx] as State;
            const symbols = new Set<number>();
            for (const item of state.items) {
                const prod = this.Productions[item.productionIdx] as Production;
                if (item.dot < prod.body.length) symbols.add(prod.body[item.dot] as number);
            }
            for (const sym of symbols) {
                const newItems = goto(
                    state.items,
                    sym,
                    this.Productions,
                    (seed) => closure(
                        seed,
                        this.Productions,
                        this.reverseNonterminalMap,
                        this.firstOfSequence.bind(this),
                        this.canBeEmpty.bind(this),
                        this.isNonterminal.bind(this)
                    )
                );
                if (newItems.length === 0) continue;
                const key = itemsKey(newItems);
                let existingIndex = seen.indexOf(key);
                if (existingIndex === -1) {
                    existingIndex = this.States.length;
                    this.States.push({ items: newItems, transitions: new Map() });
                    seen.push(key);
                    queue.push(existingIndex);
                }
                state.transitions.set(sym, existingIndex);
            }
        }
    }

    private firstOfSequence(symbols: number[]): number[] {
        const result = new Set<number>();
        for (const sym of symbols) {
            const firstSym = this.firstOfSymbol(sym);
            for (const t of firstSym) result.add(t);
            if (!this.canBeEmptySymbol(sym)) break;
        }
        return Array.from(result);
    }

    private firstOfSymbol(sym: number, visited = new Set<number>()): number[] {
        if (visited.has(sym)) return [];
        visited.add(sym);
        if (!this.isNonterminal(sym)) return [sym];

        const name = this.reverseNonterminalMap[sym];
        if (!name) return [];

        const prods = this.Productions.filter(p => p.head === name);
        const result = new Set<number>();

        for (const p of prods) {
            if (p.body.length === 0) continue;
            for (const s of p.body) {
                const firstS = this.firstOfSymbol(s, visited);
                for (const t of firstS) {
                    result.add(t);
                }
                if (!this.canBeEmptySymbol(s)) {
                    break;
                }
            }
        }
        return Array.from(result);
    }

    private canBeEmptySymbol(sym: number): boolean {
        if (!this.isNonterminal(sym)) return false;
        const name = this.reverseNonterminalMap[sym];
        if (!name) return false;
        const prods = this.Productions.filter(p => p.head === name);
        for (const p of prods) {
            if (p.body.length === 0) return true;
            let allNullable = true;
            for (const b of p.body) {
                if (!this.canBeEmptySymbol(b)) {
                    allNullable = false;
                    break;
                }
            }
            if (allNullable) return true;
        }
        return false;
    }

    private canBeEmpty(symbols: number[]): boolean {
        for (const sym of symbols) {
            if (!this.canBeEmptySymbol(sym)) return false;
        }
        return true;
    }

    private buildReverseNonterminalMap() {
        const reverse: Record<number, string> = {};
        for (const [name, idx] of Object.entries(this.nonterminalMap)) {
            reverse[idx] = name;
        }
        this.reverseNonterminalMap = reverse;
    }

    private isNonterminal(sym: number): boolean {
        return sym >= 10000;
    }
}
