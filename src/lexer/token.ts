let tokenIndex = 0;
let groupIndex = 0;

// การตั้งค่าคำหลับสร้าง (Token)
interface TokenConfig {
    name: string;
    pattern: RegExp | string;
}

// output สำหรับ Token
export interface QTokennType {
    name: string;
    pattern: RegExp | string;
    tokenIndex: number;
}

// function สำหรับสร้าง Token
export function createToken(config: TokenConfig): QTokennType {
    const name = config.name;
    const pattern = config.pattern;
    const token: QTokennType = {
        name,
        pattern,
        tokenIndex: tokenIndex++,
    }
    return token;
}

export interface GroupConfig {
    name: string;
    tokens: QTokennType[];
    groupIndex?: number;
}

export interface QGroup {
    name: string;
    tokenIndexs: Set<number>;
    groupIndex: number;
}

const allGroups: QGroup[] = [];
const tokenToGroupMap = new Map<number, QGroup>();

// function สำหรับสร้าง group ของ Token
export function createGroup(config: GroupConfig): QGroup {
    const groupIdx = config.groupIndex ?? groupIndex++;

    // ✅ 1. ถ้ามีกลุ่มเดิม groupIndex ซ้ำ → ลบทิ้งก่อน
    const existingIndex = allGroups.findIndex(g => g.groupIndex === groupIdx);
    if (existingIndex !== -1) {
        const oldGroup = allGroups[existingIndex];

        // ลบ tokenIndex เดิมออกจาก lookup map
        if (!oldGroup) { throw new Error("Old group not found"); }
        for (const idx of oldGroup.tokenIndexs) {
            tokenToGroupMap.delete(idx);
        }

        // ลบออกจาก allGroups
        allGroups.splice(existingIndex, 1);
    }

    // ✅ 2. สร้าง group ใหม่
    const newGroup: QGroup = {
        name: config.name,
        tokenIndexs: new Set(config.tokens.map(t => t.tokenIndex)),
        groupIndex: groupIdx,
    };

    // ✅ 3. เพิ่มเข้า list + map ใหม่
    allGroups.push(newGroup);
    for (const idx of newGroup.tokenIndexs) {
        tokenToGroupMap.set(idx, newGroup);
    }

    return newGroup;
}

export function findGroupOfToken(token: QTokennType): number {
    // console.log(tokenToGroupMap.get(token.tokenIndex))
  return tokenToGroupMap.get(token.tokenIndex)?.groupIndex ?? 0;
}