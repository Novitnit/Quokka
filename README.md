
## Quokka

  

TypeScript toolkit for building LR-style lexers/parsers with a CST Visitor and LSP helper. Ships ESM + CJS with type definitions.

  

### Highlights

- Simple token creation with createToken and token grouping via createGroup/SkipGroups

- Declarative grammar definition using createRule supporting option/many/or/subrule

- Automatic LR table generation with ParserTable and CST building with Parser

- Traverse/transform the CST with CSTVisitor



  

## Installation

  

Inside this repo:

  

```powershell

pnpm install

```

  

Using npm or yarn:

  

```powershell

npm install

# or

yarn install

```

  
## how to use
### Token
Tokens are the **smallest lexical units** recognized by the lexer.
Each token has a `name`, a `pattern` (regex or string), and an automatically assigned `tokenIndex`.

##### Creating Tokens
Use `createToken({ name, pattern })` to define a new token type.
```typescript
const NumberTok = createToken({ name:  "Number", pattern: /\d+/ });
const Plus = createToken({ name:  "Plus", pattern: /\+/ });
const PlusText = createToken({name:"PlusText", pattern:/plus/})
const WS = createToken({ name:  "WS", pattern: /\s+/ });
```
#### createGroup
`createGroup` is used to **combine multiple tokens into a single group**, making your lexer and parser definitions cleaner and easier to maintain.  
Instead of writing multiple `or` conditions inside a rule, you can group related tokens together.
```typescript
const Plus = createToken({ name: "Plus", pattern: /\+/ });
const Minus = createToken({ name: "Minus", pattern: /-/ });

const AdditiveGroup = createGroup({
    name: "AdditiveOp",
    tokens: [Plus, Minus]
});

```

### lexer
The `Lexer` is responsible for breaking input text into a sequence of tokens based on the token definitions you’ve created with `createToken`.  
It matches patterns, skips whitespace or ignored groups, and prepares the result for the parser.
```typescript
const TokenAll = [NumberTok,Plus,WS]
const lexer = new Lexer(TokenAll)
lexer.SkipGroup = [WS]

const input = '5 + 2'
const lexingResult = lexer.tokenize(input)
```
##### 📦 `LexingResult` contains
-   **`tokens`** — all recognized tokens (excluding skipped ones)
-   **`errors`** — any invalid or unrecognized characters
-   **`Groups`** — all token groups registered with the lexer

### Rule
A grammar rule is defined using `createRule("name", (ctx) => { ... })`.  
The `ctx` (context) provides helper methods to declaratively describe the structure of your grammar — similar to writing BNF, but in TypeScript.
```typescript
const programe = createRule("programe",(ctx)=>{
	ctx.consume(NumberTok)
	ctx.many((ctx)=>{
		ctx.or([
			(ctx) => ctx.consume(Plus)
			(ctx) => ctx.consume(PlusText)
		])
		ctx.consume(NumberTok)
	})
})
```
This rule corresponds to:
```
program → Number ( (Plus | PlusText) Number )*
```
##### 	Context API (`ctx`)
|Method| Description | Example |
|--|--|--|
|consume(token)|Match a specific token once.|ctx.consume(NumberTok)|
|option(cb)|Optional section — may appear 0 or 1 time.|ctx.option(ctx => ctx.consume(Plus))
|many(cb)|Repeatable section — may appear 0 or more times.|ctx.many(ctx => ctx.consume(NumberTok))
|or([cb1, cb2, ...])|Choose one of multiple alternatives.|ctx.or([(ctx)=>ctx.consume(Plus),(ctx)=>ctx.consume(PlusText)])
|subRule(() => Rule)|Reference another rule.|ctx.subRule(() => Term)
|useGroup(Group)|Use a token group instead of multiple `or()` tokens.|ctx.useGroup(OperatorGroup)


### parserTable
The `ParserTable` automatically builds the **LR parsing table** from your grammar rules.  
It converts rules defined with `createRule` into a ready-to-use parsing structure used by the `Parser` to construct the CST (Concrete Syntax Tree).
```typescript
const parsertable = new ParserTable()
const Table = parsertable.getTable()
```
##### ⚡ Performance Tip
Building the parser table can be **computationally expensive**, especially for large grammars.  
To improve performance:

-   **Generate the table once**, then **save it as JSON** (e.g., using `fs.writeFileSync`)
    
-   On startup, simply **load the prebuilt table** instead of rebuilding it
    
-   This can reduce parser initialization time dramatically


### Parser
The `Parser` takes a **lexing result** and a **parser table** to produce a full **Concrete Syntax Tree (CST)**.  
It processes the stream of tokens using LR parsing actions (`shift`, `reduce`, `goto`, `accept`) generated from your grammar.
```typescript
// Option 1: Use generated table directly
const parser = new Parser(table);

// Option 2: Load a saved table (faster)
import table from './table.json' with { type: "json" };
const parser = new Parser(JSON.stringify(table));

// Parse token stream
const cst = parser.parse(lexingResult);
```

### cstvisitor
The **CSTVisitor** lets you walk through the parser’s Concrete Syntax Tree (CST) and transform or analyze nodes using custom callbacks.

You register a function for each CST node type you want to handle.  
Each callback receives a node, and whatever it returns will replace that node in the tree.
```typescript
const cstvisit = new CSTVisitor()

// Register a visitor for a node type (for example, "programe")
cstvisit.visitRegister("programe", (node) => {
  return node
})
const result = cstvisit.visit(cst)
```