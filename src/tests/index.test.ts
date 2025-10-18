import { describe, it, expect } from "vitest";
import { createGroup, createRule, createToken, Lexer, Parser, ParserTable } from "../index";

// ---------- Token Definitions ----------
const Let = createToken({ name: "Let", pattern: /let/ });
const Identifier = createToken({ name: "Identifier", pattern: /[a-zA-Z_]\w*/ });
const NumberLiteral = createToken({ name: "NumberLiteral", pattern: /\d+/ });
const WhiteSpace = createToken({ name: "WhiteSpace", pattern: /\s+/ });
const Typenumber = createToken({ name: "Typenumber", pattern: /number/ });
const Typestring = createToken({ name: "Typestring", pattern: /string/ });

const TypeGroup = createGroup({ name: "TypeGroup", tokens: [Typenumber, Typestring] });
const allToken = [Let, NumberLiteral, Typenumber, Typestring, WhiteSpace, Identifier];

describe("Lexer", () => {
  it("should tokenize simple let statement", () => {
    const input = "let test";
    const lexer = new Lexer(input);
    lexer.SkipGroups = [WhiteSpace];
    const tokens = lexer.tokenize(allToken);

    expect(tokens).toMatchSnapshot()
  });

  it("should handle whitespace and newline correctly", () => {
    const input = "let    myVar\nnumber";
    const lexer = new Lexer(input);
    lexer.SkipGroups = [WhiteSpace];
    const tokens = lexer.tokenize(allToken);

    expect(tokens).toMatchSnapshot();
  });

  it("should report invalid character", () => {
    const input = "let ~";
    const lexer = new Lexer(input);
    lexer.SkipGroups = [WhiteSpace];
    const tokens = lexer.tokenize(allToken);

    expect(tokens).toMatchSnapshot()
  });
});

describe("Parser Table", () => {
  it("should build correct table for let statement with type", () => {
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
    const lexer = new Lexer(input);
    lexer.SkipGroups = [WhiteSpace];
    const tokens = lexer.tokenize(allToken);

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
    const lexer = new Lexer(input);
    lexer.SkipGroups = [WhiteSpace];
    const tokens = lexer.tokenize(allToken);

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
    const lexer = new Lexer(input);
    lexer.SkipGroups = [WhiteSpace];
    const tokens = lexer.tokenize(allToken);

    const result = parser.parse(tokens);
    expect(result).toMatchSnapshot()
  });
});
