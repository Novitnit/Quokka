import { Item } from "./Item";
import { Production } from "./types";

export function goto(
    stateItems: Item[],
    sym: number,
    productions: Production[],
    closureFn: (seed: Item[]) => Item[]
): Item[] {
    const moveItem: Item[] = [];
    for (const item of stateItems) {
        const prod = productions[item.productionIdx];
        if (!prod) continue;
        const nextSym = item.dot < prod.body.length ? prod.body[item.dot] : undefined;
        if (nextSym === sym) {
            moveItem.push({
                productionIdx: item.productionIdx,
                dot: item.dot + 1,
                lookaheads: new Set(item.lookaheads),
            });
        }
    }
    return closureFn(moveItem);
}

export function closure(
    seedItems: Item[],
    productions: Production[],
    reverseNonterminalMap: Record<number, string>,
    firstOfSequence: (symbols: number[]) => number[],
    canBeEmpty: (symbols: number[]) => boolean,
    isNonterminal: (sym: number) => boolean
): Item[] {
    const result: Item[] = [];

    const addItem = (item: Item): boolean => {
        const existing = result.find(
            it => it.productionIdx === item.productionIdx && it.dot === item.dot
        );
        if (existing) {
            const beforeSize = existing.lookaheads.size;
            for (const la of item.lookaheads) existing.lookaheads.add(la);
            return existing.lookaheads.size > beforeSize;
        } else {
            result.push(item);
            return true;
        }
    };

    seedItems.forEach(addItem);

    let changed = true;
    while (changed) {
        changed = false;
        for (const item of [...result]) {
            const sym = nextSymbol(item, productions);
            if (sym !== null && isNonterminal(sym)) {
                const prods = productionsFor(sym, productions, reverseNonterminalMap);
                const lookaheadSet = new Set<number>(computeLookaheads(item, sym, productions, firstOfSequence, canBeEmpty));
                for (const p of prods) {
                    const prodIndex = productions.indexOf(p);
                    const added = addItem({
                        productionIdx: prodIndex,
                        dot: 0,
                        lookaheads: new Set(lookaheadSet),
                    });
                    if (added) changed = true;
                }
            }
        }
    }

    return result;
}

function nextSymbol(item: Item, productions: Production[]): number | null {
    const prod = productions[item.productionIdx];
    if (!prod) return null;
    if (item.dot >= prod.body.length) return null;
    return prod.body[item.dot] as number;
}

function productionsFor(sym: number, productions: Production[], reverseMap: Record<number, string>): Production[] {
    const name = reverseMap[sym];
    if (!name) return [];
    return productions.filter(p => p.head === name);
}

function computeLookaheads(
    item: Item,
    sym: number,
    productions: Production[],
    firstOfSequence: (symbols: number[]) => number[],
    canBeEmpty: (symbols: number[]) => boolean
): number[] {
    const prod = productions[item.productionIdx] as Production;
    const beta = prod.body.slice(item.dot + 1);

    const result = new Set<number>();
    for (const t of firstOfSequence(beta)) {
        result.add(t);
    }
    if (canBeEmpty(beta)) {
        for (const la of item.lookaheads) {
            result.add(la);
        }
    }
    return Array.from(result);
}
