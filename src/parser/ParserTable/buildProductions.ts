import { Production } from "./types";
import { Impl, Rule } from "../Rule";

let manyCount = 0;

export class buildProductions {
    private Productions: Production[] = [];
    private nonterminalMap: Record<string, number> = {};
    private nonterminalCount = 10000;

    constructor(rule: Rule) {
        this.buildProductions(rule)
    }

    public getnonterminalMap(): Record<string, number> {
        return this.nonterminalMap
    }

    public getProductions(): Production[] {
        return this.Productions
    }

    private getNonterminalIndex(name: string): number {
        if (!(name in this.nonterminalMap)) {
            this.nonterminalMap[name] = this.nonterminalCount++;
        }
        return this.nonterminalMap[name] as number;
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
                const manyName = `MANY_${manyCount++}`;
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