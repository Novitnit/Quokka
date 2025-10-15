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

export class ParserTable {
    private Productions: Production[] = [];
    private Items: Item[] = []

    constructor(rule: Rule) {
        const bP = new buildProductions(rule)
        this.Productions = bP.getProductions()
        this.createItemFromProduction()
    }

    /*
     แปลง production ทั้งหมดเป็น item list
    */
    private createItemFromProduction() {
        for (let productionIdx = 0; productionIdx < this.Productions.length; productionIdx++) {
            const prod = this.Productions[productionIdx]
            if (!prod) throw ""
            // dot วิ่งตั้งแต่ 0 ถึง body.length
            for (let dot = 0; dot < prod.body.length; dot++) {
                this.Items.push({ productionIdx, dot })
            }
        }
    }
}

class buildProductions {
    private Productions: Production[] = [];
    private nonterminalMap = new Map<string, number>();
    private nonterminalCount = 10000;

    constructor(rule: Rule) {
        this.buildProductions(rule)
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

    // แปลงจาก rule ที่เป็น object ไปเป็น production
    private buildProductions(rule: Rule) {
        const bodies = this.expandImpllist(rule.body)
        for (const b of bodies) {
            this.Productions.push({ head: rule.name, body: b })
        }
        //ไล่หา subrule ซ่อนอยู่ ใน option/many/or แล้ว build productions
        for(const impl of rule.body){
            this.scanNestedForRules(impl)
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
                // 1) ไม่มี child
                const without = acc.map(a => [...a]);
                // 2) มี child
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