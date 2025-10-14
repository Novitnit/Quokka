import { Impl, Rule } from "./Rule";

export type Production = {
    head: string;
    body: number[];
}

type Item = {
    productionIdx:number
    dot:number
}

type State = {
    items:Item[]
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
        for(const b of bodies) {
            this.Productions.push({ head: rule.name, body: b })
        }
    }

    // แปลงจาก impl ที่เป็น object ไปเป็น array ของ token index
    private expandImpllist(body: Impl[]): number[][] {
        let result: number[][] = [[]]
        for(const impl of body) {
            result = this.expandImpl(impl, result)
        }
        return result
    }
    private expandImpl(impl: Impl, acc:number[][]): number[][] {
        switch(impl.implType) {
            case "consume":{
                return acc.map(a=>[...a,impl.token.tokenIndex])
            }
            case "subrule":
            case "option":{}
            case "many":
            case "or":
        }
        return [[]]
    }
}