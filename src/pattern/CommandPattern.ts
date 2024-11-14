import { Command, Node } from "../parser/CommandParser";

type SyntaxType = Node["type"];

export type Pattern =
    | { type: "literal"; content: string }
    | { type: "argument"; key: string; types: SyntaxType[] };

const ALL_TYPES: SyntaxType[] = [
    "literal",
    "string",
    "selector",
    "comment",
    "object",
    "array",
];

function literal(token: string): Pattern {
    return { type: "literal", content: token };
}

function argument(name: string, types: SyntaxType[] = ALL_TYPES): Pattern {
    return { type: "argument", key: name, types };
}

export const JSON_MESSAGE = "<message>";

const jsonPattern = () => argument(JSON_MESSAGE, ["array", "object", "string"]);

const TELLRAW_PATTERN = [
    literal("tellraw"),
    argument("target", ["selector"]),
    jsonPattern(),
];
const TITLE_PATTERN = [
    literal("title"),
    argument("target", ["selector"]),
    argument("action", ["literal"]),
    jsonPattern(),
];

const BOSSBAR_ADD_PATTERN = [
    literal("bossbar"),
    literal("add"),
    argument("target", ["literal"]),
    jsonPattern(),
];

const BOSSBAR_SET_PATTERN = [
    literal("bossbar"),
    literal("set"),
    argument("target", ["literal"]),
    literal("name"),
    jsonPattern(),
];

export const PATTERNS = [
    TELLRAW_PATTERN,
    TITLE_PATTERN,
    BOSSBAR_ADD_PATTERN,
    BOSSBAR_SET_PATTERN,
];

export function matchCommand(
    command: Command,
    patterns: Pattern[][] = PATTERNS
) {
    const patternMatcher = new PatternMatcher(command);

    const start = patternMatcher.checkpoint();

    for (const pattern of patterns) {
        try {
            const result = patternMatcher.match(pattern);

            if (result) {
                return result;
            } else {
                start.recover();
                continue;
            }
        } catch (e) {
            if (e instanceof MatchError) {
                start.recover();
            }

            throw e;
        }
    }

    return null;
}

class PatternMatcher {
    constructor(private readonly command: Command) {}

    private cursor: number = 0;

    get length() {
        return this.command.node.length;
    }

    get isEnd() {
        return this.cursor >= this.length;
    }

    peek(offset: number = 0) {
        if (this.cursor + offset >= this.length) {
            return null;
        }

        return this.command.node[this.cursor + offset];
    }

    advance() {
        return this.command.node[this.cursor++];
    }

    checkpoint() {
        const cursor = this.cursor;

        return {
            recover: () => {
                const result = this.command.node.slice(cursor, this.cursor);
                this.cursor = cursor;
                return result;
            },

            commit: () => {
                return this.command.node.slice(cursor, this.cursor);
            },
        };
    }

    match(pattern: Pattern[]): PatternMatchResult | null {
        let start = this.checkpoint();

        const map = new Map<string, string>();

        if (pattern.length === 0) {
            throw new MatchError("Pattern size must be greater than 0");
        }

        while (!this.isEnd) {
            start = this.checkpoint();

            inner: for (const pat of pattern) {
                const node = this.advance();
                const result = this.matchPattern(pat, node);

                if (!result) {
                    map.clear();
                    break inner;
                }

                if (result.key) {
                    map.set(result.key, result.content);
                }
            }

            if (map.size >= 1 && !this.isEnd) {
                throw new MatchError("Pattern is not exhausted");
            }
        }

        if (map.size === 0) {
            return null;
        }

        return { map, nodes: start.commit() };
    }

    matchPattern(pat: Pattern, node: Node) {
        if (
            pat.type === "literal" &&
            node.type === "literal" &&
            node.content === pat.content
        ) {
            return { type: "literal", content: node.content };
        }

        if (pat.type === "argument" && pat.types.includes(node.type)) {
            return { type: "argument", key: pat.key, content: node.content };
        }

        return null;
    }
}

export type PatternMatchResult = {
    map: Map<string, string>;
    nodes: Node[];
};

class MatchError extends Error {
    constructor(message: string) {
        super(message);
    }
}
