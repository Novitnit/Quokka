import { Rule } from "../Rule";
import { buildProductions } from "./buildProductions";

export type Production = {
    head: string;
    body: number[];
};

export class Grammar {
    public Productions: Production[] = [];
    public nonterminalMap: Record<string, number> = {};
    public reverseNonterminalMap: Record<number, string> = {};

    constructor(rule: Rule) {
        const bP = new buildProductions(rule);
        this.Productions = bP.getProductions();
        this.nonterminalMap = bP.getnonterminalMap();
        this.buildReverseNonterminalMap();

        const startNonterminalIdx = 99999;
        const originalStartIdx = Number(
            Object.keys(this.reverseNonterminalMap)
                .find(key => this.reverseNonterminalMap[Number(key)] === rule.name)
        );
        this.Productions.unshift({
            head: "S'",
            body: [originalStartIdx]
        });
        this.reverseNonterminalMap[startNonterminalIdx] = "S'";
    }

    private buildReverseNonterminalMap() {
        const reverse: Record<number, string> = {};
        for (const [name, idx] of Object.entries(this.nonterminalMap)) {
            reverse[idx] = name;
        }
        this.reverseNonterminalMap = reverse;
    }

    public isNonterminal(sym: number): boolean {
        return sym >= 10000;
    }

    public productionsFor(sym: number): Production[] {
        const name = this.reverseNonterminalMap[sym];
        if (!name) return [];
        return this.Productions.filter(p => p.head === name);
    }

    public firstOfSymbol(sym: number): number[] {
        if (!this.isNonterminal(sym)) {
            return [sym];
        }
        const name = this.reverseNonterminalMap[sym];
        if (!name) return [];
        const prods = this.Productions.filter(p => p.head === name);
        const result = new Set<number>();
        for (const p of prods) {
            if (p.body.length === 0) continue;
            for (const s of p.body) {
                const firstS = this.firstOfSymbol(s);
                for (const t of firstS) {
                    result.add(t);
                }
                if (this.canBeEmptySymbol(s)) {
                    continue;
                } else {
                    break;
                }
            }
        }
        return Array.from(result);
    }

    public firstOfSequence(symbols: number[]): number[] {
        const result = new Set<number>();
        for (const sym of symbols) {
            const firstSym = this.firstOfSymbol(sym);
            for (const t of firstSym) {
                result.add(t);
            }
            if (!this.canBeEmptySymbol(sym)) {
                break;
            }
        }
        return Array.from(result);
    }

    public canBeEmptySymbol(sym: number): boolean {
        if (!this.isNonterminal(sym)) {
            return false;
        }
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

    public canBeEmpty(symbols: number[]): boolean {
        for (const sym of symbols) {
            if (!this.canBeEmptySymbol(sym)) {
                return false;
            }
        }
        return true;
    }
}
