import { QGroup, QTokennType } from "../lexer/index.js";

export type Impl = ConsumeRule | SubRule | OptionRule | ManyRule | OrRule;

export interface Rule {
    name: string;
    body: Impl[];
}

export interface ConsumeRule {
    implType: "consume";
    token: QTokennType;
}

export interface SubRule {
    implType: "subrule";
    getRule: () => Rule;
}

export interface OptionRule {
    implType: "option";
    child: Impl;
}

export interface ManyRule {
    implType: "many";
    child: Impl;
}

export interface OrRule {
    implType: "or";
    alternatives: Impl[];
}

export interface CreateRuleContext {
    consume: (token: QTokennType) => void;
    option: (cb: (ctx: CreateRuleContext) => void) => void;
    many: (cb: (ctx: CreateRuleContext) => void) => void;
    or: (cbs: ((ctx: CreateRuleContext) => void)[]) => void;
    subRule: (getRule: () => Rule) => void;
    useGroup: (QGroup: QGroup) => void;
}

export function createRule(name: string, callback: (ctx: CreateRuleContext) => void): Rule {
    const body: Impl[] = [];

    const ctx: CreateRuleContext = {
        consume: (token) => {
            body.push({ implType: "consume", token });
        },
        option(cb) {
            const childBody: Impl[] = [];
            const childCtx: CreateRuleContext = createChildContext(childBody);
            cb(childCtx);
            body.push({ implType: "option", child: wrapBodyAsImpl(childBody) });
        },
        many(cb) {
            const childBody: Impl[] = [];
            const childCtx: CreateRuleContext = createChildContext(childBody);
            cb(childCtx);
            body.push({ implType: "many", child: wrapBodyAsImpl(childBody) });
        },
        or(cbs) {
            const alts: Impl[] = [];
            for (const cb of cbs) {
                const childBody: Impl[] = [];
                const childCtx: CreateRuleContext = createChildContext(childBody);
                cb(childCtx);
                alts.push(wrapBodyAsImpl(childBody));
            }
            body.push({ implType: "or", alternatives: alts });
        },
        subRule(getRule) {
            body.push({ implType: "subrule", getRule });
        },
        useGroup(QGroup: QGroup) {
            const alts: Impl[] = [];
            for (const token of QGroup.tokens) {
                alts.push({ implType: "consume", token })
            }

            if (alts.length === 1) {
                body.push(alts[0] as Impl);
            } else {
                body.push({
                    implType: "or",
                    alternatives: alts
                });
            }
        }
    };

    callback(ctx);
    return { name, body };
}

function createChildContext(body: Impl[]): CreateRuleContext {
    return {
        consume: (token) => {
            body.push({ implType: "consume", token });
        },
        option(cb) {
            const childBody: Impl[] = [];
            const childCtx: CreateRuleContext = createChildContext(childBody);
            cb(childCtx);
            body.push({ implType: "option", child: wrapBodyAsImpl(childBody) });
        },
        many(cb) {
            const childBody: Impl[] = [];
            const childCtx: CreateRuleContext = createChildContext(childBody);
            cb(childCtx);
            body.push({ implType: "many", child: wrapBodyAsImpl(childBody) });
        },
        or(cbs) {
            const alts: Impl[] = [];
            for (const cb of cbs) {
                const childBody: Impl[] = [];
                const childCtx: CreateRuleContext = createChildContext(childBody);
                cb(childCtx);
                alts.push(wrapBodyAsImpl(childBody));
            }
            body.push({ implType: "or", alternatives: alts });
        },
        subRule(getRule) {
            body.push({ implType: "subrule", getRule });
        },
        useGroup(QGroup: QGroup) {
            const alts: Impl[] = [];
            for (const token of QGroup.tokens) {
                alts.push({ implType: "consume", token })
            }

            if (alts.length === 1) {
                body.push(alts[0] as Impl);
            } else {
                body.push({
                    implType: "or",
                    alternatives: alts
                });
            }
        }
    };
}

function wrapBodyAsImpl(body: Impl[]): Impl {
    if (body[0] !== undefined && body.length === 1) return body[0];
    return {
        implType: "subrule",
        getRule: () => ({ name: "<inline>", body })
    };
}
