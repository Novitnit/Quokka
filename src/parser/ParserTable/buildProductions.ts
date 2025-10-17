import { Production } from "./types";
import { Impl, Rule } from "../Rule";

export class buildProductions {
    private Productions: Production[] = [];
    private nonterminalMap = new Map<string, number>();
    private nonterminalCount = 10000;

    constructor(rule: Rule) {
        this.buildProductions(rule)
    }

    public getnonterminalMap(): Map<string, number> {
        return this.nonterminalMap
    }

    public getProductions(): Production[] {
        return this.Productions
    }

    private getNonterminalIndex(name: string): number {
        if (!this.nonterminalMap.has(name)) {
            this.nonterminalMap.set(name, this.nonterminalCount++);
        }
        return this.nonterminalMap.get(name)!;
    }

    private buildProductions(rule: Rule) {
        this.getNonterminalIndex(rule.name);
        const bodies = this.expandImpllist(rule.body)
        for (const b of bodies) {
            this.Productions.push({ head: rule.name, body: b })
        }
        for (const impl of rule.body) {
            this.scanNestedForRules(impl)
        }
    }

    private expandImpllist(body: Impl[]): number[][] {
        let result: number[][] = [[]]
        for (const impl of body) {
            result = this.expandImpl(impl, result)
        }
        return result
    }

    private scanNestedForRules(impl: Impl) {
        switch (impl.implType) {
            case "subrule": {
                const sub = impl.getRule();
                this.buildProductions(sub);
                break;
            }
            case "option":
            case "many": {
                this.scanNestedForRules(impl.child);
                break;
            }
            case "or": {
                for (const alt of impl.alternatives) {
                    this.scanNestedForRules(alt);
                }
                break;
            }
            case "consume":
                break;
        }
    }

    private expandImpl(impl: Impl, acc: number[][]): number[][] {
        switch (impl.implType) {
            case "consume": {
                return acc.map(a => [...a, impl.token.tokenIndex])
            }
            case "option": {
                const without = acc.map(a => [...a]);
                const childBodies = this.expandImpl(impl.child, [[]]);
                const withChild = acc.flatMap(a => childBodies.map(c => [...a, ...c]));
                return [...without, ...withChild];
            }
            case "subrule": {
                const subRule = impl.getRule();
                const nonterminalIdx = this.getNonterminalIndex(subRule.name);
                return acc.map(a => [...a, nonterminalIdx]);
            }
            case "many": {
                const manyName = `MANY_${Math.random().toString(36).slice(2)}`;
                const manyIdx = this.getNonterminalIndex(manyName);
                const childBodies = this.expandImpl(impl.child, [[]]);
                this.Productions.push({
                    head: manyName,
                    body: []
                });
                for (const c of childBodies) {
                    this.Productions.push({
                        head: manyName,
                        body: [...c, manyIdx]
                    });
                }
                return acc.map(a => [...a, manyIdx]);
            }
            case "or": {
                let results: number[][] = [];
                for (const alt of impl.alternatives) {
                    const expandedAlt = this.expandImpl(alt, [[]]);
                    results = [...results, ...acc.flatMap(a => expandedAlt.map(c => [...a, ...c]))];
                }
                return results;
            }
        }
        return [[]]
    }
}