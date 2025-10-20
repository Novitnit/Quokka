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
    public SkipGroups: QTokennType[] = []

    private lineBreaks: number[] = [];

    private SkipGroup: QGroup = createGroup({ name: "SkipGroup", tokens: this.SkipGroups , groupIndex: -1});
    private errors: Error[] = []

    constructor(private AllToken: QTokennType[], private AllGroup?: QGroup[]) {
        this.lineBreaks = [];
    }

    public tokenize(input: string): LexingResult {
        this.errors = [];
        this.SkipGroup = createGroup({ name: "SkipGroup", tokens: this.SkipGroups , groupIndex: -1});
        const tokens: QToken[] = [];
        let pos = 0;

        this.lineBreaks = [];
        for (let i = 0; i < input.length; i++) {
            if (input[i] === '\n') {
                this.lineBreaks.push(i);
            }
        }

        while (pos < input.length) {
            let matched = false;
            const substring = input.slice(pos);
            for (const tokenType of this.AllToken) {
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
                    message: `Unexpected character '${input[pos]}'`,
                    line,
                    column,
                    Offset: pos
                });
                pos++;
                break;
            }
        }

        const eofOffset = input.length;
        const { line: eofLine, column: eofColumn } = this.getLineColumn(eofOffset);
        tokens.push({
            image: "<EOF>",
            startColumn: eofColumn,
            endColumn: eofColumn,
            line: eofLine,
            startOffset: eofOffset,
            endOffset: eofOffset,
            tokenType: {
                name: "<EOF>",
                pattern: /<EOF>/,
                tokenIndex: -1
            }
        });

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