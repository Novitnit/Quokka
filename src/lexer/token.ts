let tokenIndex = 0;
let groupIndex = 0;

// การตั้งค่าคำหลับสร้าง (Token)
interface TokenConfig {
    name: string;
    pattern: RegExp | string;
    group?: string;
}

// output สำหรับ Token
export interface QToken {
    name:string;
    pattern: RegExp | string;
    group: string | undefined;
    tokenIndex: number;
}

// function สำหรับสร้าง Token
export function createToken(config: TokenConfig): QToken {
    const name = config.name;
    const pattern = config.pattern;
    const group = config.group;
    const token: QToken = {
        name,
        pattern,
        group,
        tokenIndex: tokenIndex++,
    }
    return token;
}

export interface GroupConfig {
    name: string;
    tokens: QToken[];
}

export interface QGroup {
    name: string;
    tokenIndexs: number[];
    groupIndex: number;
}

// function สำหรับสร้าง group ของ Token
export function createGroup(config: GroupConfig): QGroup {
    const name = config.name;
    const tokenIndexs = config.tokens.map(t=>t.tokenIndex);     //map index จาก Qtoken
    const group: QGroup = {
        name,
        tokenIndexs,
        groupIndex: groupIndex++,
    }
    return group;
}
    