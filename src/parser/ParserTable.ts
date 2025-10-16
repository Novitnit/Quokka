import { Impl, Rule } from "./Rule";

export type Production = {
    head: string;
    body: number[];
}

type Item = {
    productionIdx: number
    dot: number
    lookaheads: Set<number>
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
    private States: State[] = []

    constructor(rule: Rule) {
        const bP = new buildProductions(rule)
        this.Productions = bP.getProductions()
        this.nonterminalMap = bP.getnonterminalMap()
        this.buildReverseNonterminalMap()

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

        this.createItemFromProduction()
        this.buildStates()
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
                this.Items.push({ productionIdx, dot, lookaheads: new Set() })
            }
        }
    }

    /*
     สร้างตาราง States
    */
    private buildStates() {
        //หา production ที่มี index = 0 และ dot = 0
        const startItem = this.Items.find(
            i => i.productionIdx === 0 && i.dot === 0
        );
        if (!startItem) throw new Error("Start item not found");
        startItem.lookaheads.add(-1)// -1 คือ idx ของ EOF
        const startClosure = this.closure([startItem]);
        this.States.push({ items: startClosure, transitions: new Map() });

        const queue: number[] = [0]
        const seen: string[] = [this.itemsKey(startClosure)]

        while (queue.length) {
            const stateIndex = queue.shift()!;
            const state = this.States[stateIndex]
            if (!state) throw `Not have This State ${stateIndex}`
            const symbols = new Set<number>()
            for (const item of state.items) {
                const prod = this.Productions[item.productionIdx] as Production;
                const sym = prod.body[item.dot];
                if (item.dot < prod.body.length) {
                    symbols.add(prod.body[item.dot] as number);
                }
            }

            for (const sym of symbols) {
                const newItems = this.goto(state, sym);
                if (newItems.length === 0) continue;

                const key = this.itemsKey(newItems);

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
        // console.log("States:", this.States);
    }

    private itemsKey(items: Item[]): string {
        return items
            .map(i => {
                const lookaheads = Array.from(i.lookaheads).sort((a, b) => a - b).join(",");
                return `${i.productionIdx}.${i.dot}.${lookaheads}`;
            })
            .sort() // ทำให้ลำดับ item ไม่สำคัญ
            .join("|");
    }

    private goto(state: State, sym: number) {
        const moveItem: Item[] = []
        for (const Item of state.items) {
            const prod = this.Productions[Item.productionIdx]
            if (!prod) continue;

            const nextSym = Item.dot < prod.body.length ? prod.body[Item.dot] : undefined;
            if (nextSym === sym) {
                moveItem.push({
                    productionIdx: Item.productionIdx,
                    dot: Item.dot + 1,
                    lookaheads: new Set(Item.lookaheads),
                });
            }
        }
        return this.closure(moveItem);
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
                        const lookaheadSet = new Set<number>(this.computeLookaheads(item, sym));
                        if (addItem({ productionIdx: prodIndex, dot: 0, lookaheads: lookaheadSet })) {
                            changed = true;
                        }

                    }
                }
            }
        }
        return result;
    }

    private computeLookaheads(item: Item, sym: number): number[] {
        const prod = this.Productions[item.productionIdx];
        if (prod === undefined) throw "this.Productions[item.productionIdx] is undentifire"
        // ส่วนของ production หลัง symbol ที่อยู่หลัง dot
        const beta = prod.body.slice(item.dot + 1);

        const result = new Set<number>();

        // 1️⃣ FIRST(beta)
        for (const t of this.firstOfSequence(beta)) {
            result.add(t);
        }

        // 2️⃣ ถ้า beta nullable → รวม lookahead ของ item ปัจจุบัน
        if (this.canBeEmpty(beta)) {
            for (const la of item.lookaheads) {
                result.add(la);
            }
        }

        return Array.from(result);
    }

    private firstOfSequence(symbols: number[]): number[] {
        const result = new Set<number>();
        let nullableSoFar = true;

        for (const sym of symbols) {
            const firstSym = this.firstOfSymbol(sym);
            for (const t of firstSym) {
                result.add(t);
            }
            if (!this.canBeEmptySymbol(sym)) {
                nullableSoFar = false;
                break;
            }
        }

        return Array.from(result);
    }

    /**
     * คืน FIRST set ของ symbol เดียว (terminal หรือ nonterminal)
     */
    private firstOfSymbol(sym: number): number[] {
        // ถ้าเป็น terminal → FIRST(sym) = { sym }
        if (!this.isNonterminal(sym)) {
            return [sym];
        }

        // ถ้าเป็น nonterminal → FIRST(sym) = union ของ FIRST ของ body ตัวแรกในทุก production
        const name = this.reverseNonterminalMap[sym];
        if (!name) return [];

        const prods = this.Productions.filter(p => p.head === name);
        const result = new Set<number>();

        for (const p of prods) {
            if (p.body.length === 0) {
                // Production ว่าง → nullable → ไม่มี terminal ใน FIRST
                continue;
            }

            // อ่าน body จากซ้ายไปขวา
            for (const s of p.body) {
                const firstS = this.firstOfSymbol(s);
                for (const t of firstS) {
                    result.add(t);
                }

                // ถ้า symbol นี้ nullable → เดินต่อไป
                if (this.canBeEmptySymbol(s)) {
                    continue;
                } else {
                    break;
                }
            }
        }

        return Array.from(result);
    }


    /**
     * ตรวจว่า symbol ตัวเดียวสามารถเป็น ε (nullable) ได้ไหม
     */
    private canBeEmptySymbol(sym: number): boolean {
        // terminal → ไม่มีวันเป็น ε
        if (!this.isNonterminal(sym)) {
            return false;
        }

        const name = this.reverseNonterminalMap[sym];
        if (!name) return false;

        const prods = this.Productions.filter(p => p.head === name);

        // ถ้ามี production ที่ body ว่าง → nullable ทันที
        for (const p of prods) {
            if (p.body.length === 0) {
                return true;
            }

            // ตรวจว่าทุก symbol ใน body nullable ไหม
            let allNullable = true;
            for (const b of p.body) {
                if (!this.canBeEmptySymbol(b)) {
                    allNullable = false;
                    break;
                }
            }
            if (allNullable) {
                return true;
            }
        }

        return false;
    }


    private canBeEmpty(symbols: number[]): boolean {
        for (const sym of symbols) {
            if (!this.canBeEmptySymbol(sym)) {
                return false;
            }
        }
        return true;
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
                const childBodies = this.expandImpl(impl.child, [[]]);
                let results = acc.map(a => [...a]); 
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