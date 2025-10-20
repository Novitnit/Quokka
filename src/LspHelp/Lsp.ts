import { VisitorResult } from "../CstVisitor";
import { parserError } from "../parser";
import { Table } from "../parser/ParserTable/ActionAndGotoTable";
import { AutoComplete } from "./AutoComplete";

type LspHelpCtx = {
    Table: string | Table;
    ParserErrors: parserError[];
    stateStack: number[];
} | {
    Table: string | Table;
    VisitorResult: VisitorResult;
}

export class LspHelp {
    public autoComplete: AutoComplete;

    constructor(ctx: LspHelpCtx) {
        if ("VisitorResult" in ctx) {
            this.autoComplete = new AutoComplete({ Table:ctx.Table, ParserErrors:ctx.VisitorResult.errors , stateStack: ctx.VisitorResult.StateStack });
        } else {
            this.autoComplete = new AutoComplete({ Table:ctx.Table, ParserErrors:ctx.ParserErrors, stateStack: ctx.stateStack });
        }
    }
}