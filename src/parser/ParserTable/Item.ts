import { Production } from "./types";

export type Item = {
    productionIdx: number;
    dot: number;
    lookaheads: Set<number>;
};

export function createItemsFromProductions(productions: Production[]): Item[] {
    const items: Item[] = [];
    for (let productionIdx = 0; productionIdx < productions.length; productionIdx++) {
        const prod = productions[productionIdx];
        if (!prod) throw new Error("Production is undefined");
        for (let dot = 0; dot <= prod.body.length; dot++) {
            items.push({ productionIdx, dot, lookaheads: new Set() });
        }
    }
    return items;
}

export function itemsKey(items: Item[]): string {
    return items
        .map(i => {
            const lookaheads = Array.from(i.lookaheads).sort((a, b) => a - b).join(",");
            return `${i.productionIdx}.${i.dot}.${lookaheads}`;
        })
        .sort()
        .join("|");
}
