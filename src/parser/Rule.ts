import { QTokennType } from "../lexer";

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
    consume: (token: QTokennType) => void
    // subRule: (getRule: () => Rule) => void
    // option: (cb: (ctx: CreateRuleContext) => void) => void
}

export function createRule(name: string, callback: (ctx: CreateRuleContext) => void): Rule {
    const body: Impl[] = []
    const ctx: CreateRuleContext = {
        consume: (token) => {
            body.push({ implType: "consume", token })
        },
    }

    callback(ctx)
    return {
        name,
        body
    }
}