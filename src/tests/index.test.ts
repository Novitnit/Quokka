import { describe, it, expect } from "vitest";
import { createGroup, createRule, createToken, CSTVisitor, Lexer, Parser, ParserTable } from "../index";
import { buildProductions } from "../parser/ParserTable/buildProductions";
import { ActionAndGotoTable } from "../parser/ParserTable/ActionAndGotoTable";
import { State } from "../parser/ParserTable";

const Let = createToken({ name: "Let", pattern: /let/ });
const Identifier = createToken({ name: "Identifier", pattern: /[a-zA-Z_]\w*/ });
const Equals = createToken({ name: "Equals", pattern: /=/ });
const NumberLiteral = createToken({ name: "NumberLiteral", pattern: /\d+/ });
const WhiteSpace = createToken({ name: "WhiteSpace", pattern: /\s+/ });
const Typenumber = createToken({ name: "Typenumber", pattern: /number/ });
const Typestring = createToken({ name: "Typestring", pattern: /string/ });

const TypeGroup = createGroup({ name: "TypeGroup", tokens: [Typenumber, Typestring] });
const allTokens = [Let, Equals, NumberLiteral, Typenumber, Typestring, WhiteSpace, Identifier];

const inputsucceed = `let test = 10`
const inputRulefail = `let 123 test =`
const inputfail = `let = 10 ~`

const lexer = new Lexer(allTokens)
lexer.SkipGroups = [WhiteSpace];

describe("Lexer", () => {
  it("create token", () => {
    expect(Let).toMatchSnapshot();
  });

  it("create group", () => {
    expect(TypeGroup).toMatchSnapshot();
  });

  it("tokenize succeed", () => {
    const lexResult = lexer.tokenize(inputsucceed);
    expect(lexResult).toMatchSnapshot();
  })

  it("tokenize fail", () => {
    const lexResult = lexer.tokenize(inputfail);
    expect(lexResult.errors.length).toBeGreaterThan(0);
  });

});

const Program = createRule("Program", (ctx) => {
  ctx.many((ctx) => {
    ctx.subRule(() => LetStatement);
  });
});

const LetStatement = createRule("LetStatement", (ctx) => {
  ctx.consume(Let);
  ctx.consume(Identifier);
  ctx.consume(Equals);
  ctx.consume(NumberLiteral);
  ctx.option((ctx) => {
    ctx.useGroup(TypeGroup);
  })
});


describe("Rule", () => {
  it("test consume", () => {
    const RuleConsume = createRule("RuleConsume", (ctx) => {
      ctx.consume(Let);
      ctx.consume(Identifier);
    });
    expect(RuleConsume).toMatchSnapshot();
  })

  it("test option", () => {
    const RuleOption = createRule("RuleOption", (ctx) => {
      ctx.consume(Let);
      ctx.option((ctx) => {
        ctx.consume(Identifier);
      })
    });
    expect(RuleOption).toMatchSnapshot();
  })

  it("test many", () => {
    const RuleMany = createRule("RuleMany", (ctx) => {
      ctx.consume(Let);
      ctx.many((ctx) => {
        ctx.consume(Identifier);
      })
    });
    expect(RuleMany).toMatchSnapshot();
  })

  it("test useGroup", () => {
    const RuleUseGroup = createRule("RuleUseGroup", (ctx) => {
      ctx.consume(Let);
      ctx.useGroup(TypeGroup);
    });
    expect(RuleUseGroup).toMatchSnapshot();
  });

  it("test subRule", () => {
    const SubRuleTest = createRule("SubRuleTest", (ctx) => {
      ctx.subRule(() => LetStatement);
    });
    expect(SubRuleTest).toMatchSnapshot();
  });

  it("test or", () => {
    const RuleOr = createRule("RuleOr", (ctx) => {
      ctx.consume(Let);
      ctx.or([
        (ctx) => ctx.consume(Typenumber),
        (ctx) => ctx.consume(Typestring)
      ]);
    });
    expect(RuleOr).toMatchSnapshot();
  });
});

describe("ParserTable", () => {
  it("create Production Table", () => {
    const ProductionTable = new buildProductions(Program);
    expect(ProductionTable.getProductions()).toMatchSnapshot();
  })

  it("create Action and Goto Table", () => {
    let state: State[] = []
    const ProductionTable = new buildProductions(Program);
    function isNonterminal(sym: number): boolean {
      return sym >= 10000;
    }
    const NonterminalMap = ProductionTable.getnonterminalMap();
    const ActionTable = new ActionAndGotoTable(state, ProductionTable.getProductions(), isNonterminal.bind(this), NonterminalMap);
  })

  it("create Parser Table", () => {
    const parserTable = new ParserTable(Program);
    expect(parserTable.getTable()).toMatchSnapshot();
  })
})

describe("Parser", () => {
  it("parse Rule succeed", () => {
    const lexResult = lexer.tokenize(inputsucceed);
    const parserTable = new ParserTable(Program);
    const parser = new Parser(parserTable.getTable());
    const cst = parser.parse(lexResult);

    expect(cst).toMatchSnapshot();
  });

  it("parse Rule fail", () => {
    const lexResult = lexer.tokenize(inputRulefail);
    const parserTable = new ParserTable(Program);
    const parser = new Parser(parserTable.getTable());
    const cst = parser.parse(lexResult);

    expect(cst).toMatchSnapshot();
  });
})

describe("CSTVisitor", () => {
  it("visit Register req", () => {
    const lexResult = lexer.tokenize(inputsucceed);
    const parserTable = new ParserTable(Program);
    const parser = new Parser(parserTable.getTable());
    const cst = parser.parse(lexResult);
    const visitor = new CSTVisitor(cst);
    expect(() => visitor.visit()).toThrowError("No visitRegister found for node type: LetStatement");
  })

  it("visit LetStatement", () => {
    const lexResult = lexer.tokenize(inputsucceed);
    const parserTable = new ParserTable(Program);
    const parser = new Parser(parserTable.getTable());
    const cst = parser.parse(lexResult);
    const visitor = new CSTVisitor(cst);

    visitor.visitRegister("Program", (node) => {
      return node
    })

    visitor.visitRegister("LetStatement", (node) => {
      return node
    })

    expect(visitor.visit()).toMatchSnapshot();
  })
})