import { createGroup, findGroupOfToken, QGroup, QTokennType } from "./token";

export interface QToken {
    startColumn: number;
    endColumn: number;
    line: number;
    image: string;
    startOffset: number;
    endOffset: number;
    tokenType: QTokennType;
}

export interface LexingResult {
    tokens: QToken[];
    errors: Error[];
    Groups: QGroup[];
}

export interface Error {
    message: string;
    line: number;
    column: number;
    Offset: number;
}

export class Lexer {
    //กลุ่มสำหรับข้าม
    public SkipGroups: QTokennType[] = []

    //เก็บตำแหน่งขึ้นบรรทัดใหม่
    private lineBreaks: number[] = [];

    //setUp 
    private SkipGroup: QGroup = createGroup({ name: "SkipGroup", tokens: this.SkipGroups , groupIndex: -1});
    private errors: Error[] = []

    constructor(private input: string, private AllGroup?: QGroup[]) {
        this.lineBreaks = [];
        for (let i = 0; i < input.length; i++) {
            if (input[i] === '\n') {
                this.lineBreaks.push(i);
            }
        }
    }

    public tokenize(AllToken: QTokennType[]): LexingResult {
        this.SkipGroup = createGroup({ name: "SkipGroup", tokens: this.SkipGroups , groupIndex: -1});
        const tokens: QToken[] = [];
        let pos = 0;

        while (pos < this.input.length) {
            let matched = false;
            const substring = this.input.slice(pos);
            for (const tokenType of AllToken) {
                const regexp = typeof tokenType.pattern === 'string' ? new RegExp('^' + tokenType.pattern) : new RegExp('^' + tokenType.pattern.source);
                const match = substring.match(regexp);
                if (match) {
                    const image = match[0];
                    const startOffset = pos;
                    const endOffset = pos + image.length - 1;
                    if (findGroupOfToken(tokenType) !== -1) {
                        const { line: startLine, column: startColumn } = this.getLineColumn(startOffset);
                        const { line: endLine, column: endColumn } = this.getLineColumn(endOffset);
                        
                        const token: QToken = {
                            image,
                            startColumn,
                            endColumn,
                            line: startLine,
                            startOffset,
                            endOffset,
                            tokenType
                        }

                        tokens.push(token);
                    }
                    pos += image.length;
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                const { line, column } = this.getLineColumn(pos);
                this.errors.push({
                    message: `Unexpected character '${this.input[pos]}'`,
                    line,
                    column,
                    Offset: pos
                });
                pos++;
                break; // หยุดการทำงานเมื่อเจอข้อผิดพลาด
            }
        }

        const Groups:QGroup[] = [...this.AllGroup??[],this.SkipGroup]; 

        return {
            tokens,
            errors: this.errors,
            Groups
        }
    }

    private getLineColumn(offset: number): { line: number; column: number } {
        let low = 0;
        let high = this.lineBreaks.length - 1;

        while (low <= high) {
            const mid = (low + high) >> 1;
            const lineBreak = this.lineBreaks[mid];
            if (lineBreak && lineBreak < offset) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        const line = low + 1;
        const prevBreak = this.lineBreaks[low - 1] ?? -1;
        const column = offset - prevBreak;
        return { line, column };
    }

}