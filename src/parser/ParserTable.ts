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
    private nonterminalMap: Map<string, number> = new Map<string, number>
    private reverseNonterminalMap: Record<number, string> = {}

    constructor(rule: Rule) {
        const bP = new buildProductions(rule)
        this.Productions = bP.getProductions()
        this.createItemFromProduction()
        this.nonterminalMap = bP.getnonterminalMap()
        this.buildReverseNonterminalMap()
    }

    /*
     แปลง production ทั้งหมดเป็น item list
    */
    private createItemFromProduction() {
        for (let productionIdx = 0; productionIdx < this.Productions.length; productionIdx++) {
            const prod = this.Productions[productionIdx]
            if (!prod) throw "Productions[productionIdx] is undentify"
            // dot วิ่งตั้งแต่ 0 ถึง body.length
            for (let dot = 0; dot <= prod.body.length; dot++) {
                this.Items.push({ productionIdx, dot })
            }
        }
    }

    private closure(seedItems: Item[]): Item[] {
        const result: Item[] = [];
        const seen = new Set<string>();

        const addItem = (item: Item) => {
            const key = `${item.productionIdx}-${item.dot}`;
            if (!seen.has(key)) {
                seen.add(key);
                result.push(item);
                return true;
            }
            return false;
        };

        seedItems.forEach(addItem);

        let changed = true;
        while (changed) {
            changed = false;
            for (const item of [...result]) {
                const sym = this.nextSymbol(item);
                if (sym !== null && this.isNonterminal(sym)) {
                    const prods = this.productionsFor(sym);
                    for (const p of prods) {
                        const prodIndex = this.Productions.indexOf(p);
                        if (addItem({ productionIdx: prodIndex, dot: 0 })) {
                            changed = true;
                        }
                    }
                }
            }
        }
        return result;
    }

    private productionsFor(sym: number): Production[] {
        const name = this.reverseNonterminalMap[sym];
        if (!name) return [];
        return this.Productions.filter(p => p.head === name);
    }

    private buildReverseNonterminalMap() {
        const reverse: Record<number, string> = {};
        for (const [name, idx] of this.nonterminalMap.entries()) {
            reverse[idx] = name;
        }
        this.reverseNonterminalMap = reverse;
    }


    private isNonterminal(sym: number): boolean {
        return sym >= 10000
    }

    private nextSymbol(item: Item): number | null {
        const prod = this.Productions[item.productionIdx];
        if (!prod) return null
        const prodBody = prod.body[item.dot]
        if (prodBody === undefined) return null
        return item.dot < prod.body.length ? prodBody : null;
    }
}

class buildProductions {
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

    // แปลงจาก rule ที่เป็น object ไปเป็น production
    private buildProductions(rule: Rule) {
        const bodies = this.expandImpllist(rule.body)
        for (const b of bodies) {
            this.Productions.push({ head: rule.name, body: b })
        }
        //ไล่หา subrule ซ่อนอยู่ ใน option/many/or แล้ว build productions
        for (const impl of rule.body) {
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