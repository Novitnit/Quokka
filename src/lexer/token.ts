let tokenIndex = 0;
let groupIndex = 0;

interface TokenConfig {
    name: string;
    pattern: RegExp | string;
}

export interface QTokennType {
    name: string;
    pattern: RegExp | string;
    tokenIndex: number;
}

const TokenMap:Record<number,string> = {}

export function createToken(config: TokenConfig): QTokennType {
    const name = config.name;
    const pattern = config.pattern;
    TokenMap[tokenIndex] = name
    const token: QTokennType = {
        name,
        pattern,
        tokenIndex: tokenIndex++,
    }
    return token;
}

export function getTokenMap(){
    return TokenMap
}

export interface GroupConfig {
    name: string;
    tokens: QTokennType[];
    groupIndex?: number;
}

export interface QGroup {
    name: string;
    tokenIndexs: Set<number>;
    tokens: QTokennType[];
    groupIndex: number;
}

const allGroups: QGroup[] = [];
const tokenToGroupMap = new Map<number, QGroup>();

// function สำหรับสร้าง group ของ Token
export function createGroup(config: GroupConfig): QGroup {
    const groupIdx = config.groupIndex ?? groupIndex++;
    const existingIndex = allGroups.findIndex(g => g.groupIndex === groupIdx);
    if (existingIndex !== -1) {
        const oldGroup = allGroups[existingIndex];

        if (!oldGroup) { throw new Error("Old group not found"); }
        for (const idx of oldGroup.tokenIndexs) {
            tokenToGroupMap.delete(idx);
        }

        allGroups.splice(existingIndex, 1);
    }

    const newGroup: QGroup = {
        name: config.name,
        tokenIndexs: new Set(config.tokens.map(t => t.tokenIndex)),
        groupIndex: groupIdx,
        tokens: config.tokens
    };

    allGroups.push(newGroup);
    for (const idx of newGroup.tokenIndexs) {
        tokenToGroupMap.set(idx, newGroup);
    }

    return newGroup;
}

export function findGroupOfToken(token: QTokennType): number {
  return tokenToGroupMap.get(token.tokenIndex)?.groupIndex ?? 0;
}