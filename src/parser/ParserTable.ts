import { Impl, Rule } from "./Rule";

export type Production = {
    head: string;
    body: number[];
}

type Item = {
    productionIdx: number
    dot: number
}

type State = {
    items: Item[]
    transitions: Map<number, number>
}

class buildProductions {
    private Productions: Production[] = [];

    constructor(rule: Rule) {
        this.buildProductions(rule)
    }

    public getProductions(): Production[] {
        return this.Productions
    }

    // แปลงจาก rule ที่เป็น object ไปเป็น production
    private buildProductions(rule: Rule) {
        const bodies = this.expandImpllist(rule.body)
        for (const b of bodies) {
            this.Productions.push({ head: rule.name, body: b })
        }
    }

    // แปลงจาก impl ที่เป็น object ไปเป็น array ของ token index
    private expandImpllist(body: Impl[]): number[][] {
        let result: number[][] = [[]]
        for (const impl of body) {
            result = this.expandImpl(impl, result)
        }
        return result
    }
    private expandImpl(impl: Impl, acc: number[][]): number[][] {
        switch (impl.implType) {
            case "consume": {
                return acc.map(a => [...a, impl.token.tokenIndex])
            }
            case "option": {
                // 1) ไม่มี child
                const without = acc.map(a => [...a]);
                // 2) มี child
                const childBodies = this.expandImpl(impl.child, [[]]);
                const withChild = acc.flatMap(a => childBodies.map(c => [...a, ...c]));
                return [...without, ...withChild];
            }
            case "subrule": {
                const subRule = impl.getRule();
                const subBodies = this.expandImpllist(subRule.body);
                return acc.flatMap(a => subBodies.map(b => [...a, ...b]));
            }
            case "many": {
                // many = 0 หรือมากกว่า → นี่เป็นเวอร์ชันง่าย ไม่ recursive
                const childBodies = this.expandImpl(impl.child, [[]]);
                let results = acc.map(a => [...a]); // เวอร์ชันไม่มีเลย
                // จำกัดจำนวนซ้ำ เช่น 1-3 รอบ
                for (const a of acc) {
                    for (const c of childBodies) {
                        results.push([...a, ...c]);
                        results.push([...a, ...c, ...c]);
                    }
                }
                return results;
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