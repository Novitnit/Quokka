import { describe, it, expect } from "vitest";
import { createGroup, createRule, createToken, CSTVisitor, Lexer, Parser, ParserTable } from "../index";

const Let = createToken({ name: "Let", pattern: /let/ });
const Identifier = createToken({ name: "Identifier", pattern: /[a-zA-Z_]\w*/ });
const NumberLiteral = createToken({ name: "NumberLiteral", pattern: /\d+/ });
const WhiteSpace = createToken({ name: "WhiteSpace", pattern: /\s+/ });
const Typenumber = createToken({ name: "Typenumber", pattern: /number/ });
const Typestring = createToken({ name: "Typestring", pattern: /string/ });

const TypeGroup = createGroup({ name: "TypeGroup", tokens: [Typenumber, Typestring] });
const allToken = [Let, NumberLiteral, Typenumber, Typestring, WhiteSpace, Identifier];

describe("Lexer", () => {
  it("tokenize successfully", () => {
    const input = "let test";
    const lexer = new Lexer(allToken);
    lexer.SkipGroups = [WhiteSpace];
    const tokens = lexer.tokenize(input);

    expect(tokens).toMatchSnapshot()
  });

  it("handle whitespace and newline correctly", () => {
    const input = "let    myVar\nnumber";
    const lexer = new Lexer(allToken);
    lexer.SkipGroups = [WhiteSpace];
    const tokens = lexer.tokenize(input);

    expect(tokens).toMatchSnapshot();
  });

  it("tokenize report invalid character", () => {
    const input = "let ~";
    const lexer = new Lexer(allToken);
    lexer.SkipGroups = [WhiteSpace];
    const tokens = lexer.tokenize(input);

    expect(tokens).toMatchSnapshot()
  });
});

describe("Parser Table", () => {
  it("successfully", () => {
    const Main = createRule("Main", (r) => {
      r.consume(Let);
      r.consume(Identifier);
      r.useGroup(TypeGroup);
    });

    const parserTable = new ParserTable(Main);
    expect(parserTable.getTable()).toMatchSnapshot();
  });
});

describe("Parser", () => {
  it("should parse simple let statement", () => {
    const Main = createRule("Main", (r) => {
      r.consume(Let);
      r.consume(Identifier);
    });

    const parserTable = new ParserTable(Main);
    const parser = new Parser(parserTable.getTable());

    const input = "let test";
  const lexer = new Lexer(allToken);
    lexer.SkipGroups = [WhiteSpace];
  const tokens = lexer.tokenize(input);

    const result = parser.parse(tokens);
    expect(result).toMatchSnapshot()
  });

  it("should parse let statement with type correctly", () => {
    const Main = createRule("Main", (r) => {
      r.consume(Let);
      r.consume(Identifier);
      r.useGroup(TypeGroup);
    });

    const parserTable = new ParserTable(Main);
    const parser = new Parser(parserTable.getTable());

    const input = "let myVar number";
  const lexer = new Lexer(allToken);
    lexer.SkipGroups = [WhiteSpace];
  const tokens = lexer.tokenize(input);

    const result = parser.parse(tokens);
    expect(result).toMatchSnapshot()
  });

  it("should report syntax error if type is missing", () => {
    const Main = createRule("Main", (r) => {
      r.consume(Let);
      r.consume(Identifier);
      r.useGroup(TypeGroup);
    });

    const parserTable = new ParserTable(Main);
    const parser = new Parser(parserTable.getTable());

    const input = "let myVar";
  const lexer = new Lexer(allToken);
    lexer.SkipGroups = [WhiteSpace];
  const tokens = lexer.tokenize(input);

    const result = parser.parse(tokens);
    expect(result).toMatchSnapshot()
  });
});

describe("CST Visitor", () => {
  it("should visit and modify CST nodes successfully", () => {
    const Main = createRule("Main", (r) => {
      r.consume(Let);
      r.consume(Identifier);
    });

    const parserTable = new ParserTable(Main);
    const parser = new Parser(parserTable.getTable());

    const input = "let testVar";
  const lexer = new Lexer(allToken);
    lexer.SkipGroups = [WhiteSpace];
  const tokens = lexer.tokenize(input);

    const cst = parser.parse(tokens);

    const visitor = new CSTVisitor(cst);
    visitor.visitRegister("Main", (node: any) => {
      return node.children
    });

    const modifiedCST = visitor.visit();
    expect(modifiedCST).toMatchInlineSnapshot(`
      {
        "StateStack": [
          0,
          1,
        ],
        "cst": [
          {
            "CstType": "TokenNode",
            "EndColumn": 3,
            "EndOffset": 2,
            "StartColumn": 1,
            "StartOffset": 0,
            "image": "let",
            "line": 1,
            "tokenIdx": 0,
            "type": "Let",
          },
          {
            "CstType": "TokenNode",
            "EndColumn": 11,
            "EndOffset": 10,
            "StartColumn": 5,
            "StartOffset": 4,
            "image": "testVar",
            "line": 1,
            "tokenIdx": 1,
            "type": "Identifier",
          },
        ],
        "errors": [],
      }
    `);
  });

  it("should throw error when visiting not have visitRegister", () => {
    const Main = createRule("Main", (r) => {
      r.consume(Let);
      r.consume(Identifier);
      r.subRule(() => subrule);
    });

    const subrule = createRule("subrule", (r) => {
      r.consume(Typenumber);
    });

    const parserTable = new ParserTable(Main);
    const parser = new Parser(parserTable.getTable());

    const input = "let testVar number";
  const lexer = new Lexer(allToken);
    lexer.SkipGroups = [WhiteSpace];
  const tokens = lexer.tokenize(input);
    const cst = parser.parse(tokens);

    const visitor = new CSTVisitor(cst);

    expect(() => visitor.visit()).toThrowError(
      `No visitRegister found for node type: subrule`
    );
  });
});
