import { Range, TextDocument } from "vscode";
import * as z from "zod";

export type ParseResult =
    | { type: "preview"; range: Range; value: string }
    | { type: "command"; range: Range }
    | { type: "error"; range: Range; value: string }
    | { type: "multiline"; range: Range; value: string };

export function parseFunction(document: TextDocument): ParseResult[] {
    const parser = new Parser(document.getText());
    const commandProcessor = new CommandProcessor();
    const result: ParseResult[] = [];

    while (true) {
        const command = parser.nextCommand();

        if (!command) {
            break;
        }

        const { span, text } = command;
        const from = document.positionAt(span.from);
        const line = document.lineAt(from.line);

        try {
            const syntax = commandProcessor.match(text);

            if (syntax.valid) {
                const message = syntax.args["message"];
                const jsonMessage = parseJsonMessage(message);
                const interpretedMessage = interpretMessage(jsonMessage);

                result.push({
                    type: "preview",
                    range: line.range,
                    value: interpretedMessage,
                });
            }
        } catch (e: unknown) {
            if (e instanceof z.ZodError) {
                console.error(e.format()._errors);
                result.push({
                    type: "error",
                    range: line.range,
                    value: `could not parse JSON`,
                });
            } else if (e instanceof Error) {
                result.push({
                    type: "error",
                    range: line.range,
                    value: `${e.message}`,
                });
            }
        }
    }

    return result;
}

export class Parser {
    private cursor = 0;

    constructor(private readonly text: string) {}

    get length() {
        return this.text.length;
    }

    get isEnd() {
        return this.cursor >= this.text.length;
    }

    peek(): string {
        return this.text[this.cursor];
    }

    next(): string {
        return this.text[this.cursor++];
    }

    at(offset: number = 0): string {
        if (
            this.cursor + offset < 0 ||
            this.cursor + offset >= this.text.length
        ) {
            return "";
        }

        return this.text[this.cursor + offset];
    }

    skipWhitespace() {
        while (!this.isEnd) {
            const char = this.peek();

            if (
                char === " " ||
                char === "\n" ||
                char === "\r" ||
                char === "\t"
            ) {
                this.next();
            } else {
                break;
            }
        }
    }

    nextCommand() {
        if (this.isEnd) {
            return null;
        }

        this.skipWhitespace();

        const start = this.cursor;

        while (!this.isEnd) {
            const char = this.peek();

            if (char === "\n") {
                // continue parsing if it is a multiline command
                if (this.at(-1) === "\\") {
                    this.next();
                    continue;
                }

                if (this.at(-1) === "\r" && this.at(-2) === "\\") {
                    this.next();
                    continue;
                }

                this.next();
                break;
            }

            this.next();
        }

        return {
            span: { from: start, to: this.cursor - 1 },
            text: this.text
                .substring(start, this.cursor)
                .replace(/\\(?=\r?\n)/g, ""),
        };
    }
}

function parseJsonMessage(text: string): JsonMessage {
    const input = text.replace(/\\n/g, "");
    const json = JSON.parse(input);
    return JsonMessage.parse(json);
}

const JsonMessage: z.ZodType<JsonMessage> = z.lazy(() =>
    z.union([
        TextJsonMessage,
        SelectorJsonMessage,
        KeybindJsonMessage,
        TranslateJsonMessage,
        ScoreboardJsonMessage,
        BlockNbtJsonMessage,
        EntityNbtJsonMessage,
        StorageNbtJsonMessage,
        StringJsonMessage,
        z.array(JsonMessage),
    ])
);

const TextJsonMessage = z.object({
    type: z.optional(z.literal("text")),
    text: z.string(),
});

const StringJsonMessage = z.string();

const SelectorJsonMessage = z.object({
    type: z.optional(z.literal("selector")),
    selector: z.string(),
    separator: z.optional(JsonMessage),
});

const KeybindJsonMessage = z.object({
    type: z.optional(z.literal("keybind")),
    keybind: z.string(),
});

const TranslateJsonMessage = z.object({
    type: z.optional(z.literal("translatable")),
    translate: z.string(),
    with: z.optional(z.array(JsonMessage)),
    fallback: z.optional(JsonMessage),
});

const ScoreboardJsonMessage = z.object({
    type: z.optional(z.literal("score")),
    score: z.object({
        name: z.string(),
        objective: z.string(),
    }),
});

const NbtJsonMessage = z.object({
    type: z.optional(z.literal("nbt")),
    nbt: z.string(),
    interpret: z.optional(z.boolean()),
    separator: z.optional(JsonMessage),
});

const BlockNbtJsonMessage = NbtJsonMessage.extend({
    source: z.optional(z.literal("block")),
    block: z.string(),
});

const EntityNbtJsonMessage = NbtJsonMessage.extend({
    source: z.optional(z.literal("entity")),
    entity: z.string(),
});

const StorageNbtJsonMessage = NbtJsonMessage.extend({
    source: z.optional(z.literal("storage")),
    storage: z.string(),
});

interface BaseJsonMessage {}

interface TextJsonMessage extends BaseJsonMessage {
    type?: "text";
    text: string;
}

interface SelectorJsonMessage extends BaseJsonMessage {
    type?: "selector";
    selector: string;
    separator?: JsonMessage;
}

interface KeybindJsonMessage extends BaseJsonMessage {
    type?: "keybind";
    keybind: string;
}

interface TranslateJsonMessage extends BaseJsonMessage {
    type?: "translatable";
    translate: string;
    with?: JsonMessage[];
    fallback?: JsonMessage;
}

interface ScoreboardJsonMessage extends BaseJsonMessage {
    type?: "score";
    score: {
        name: string;
        objective: string;
    };
}

interface NbtJsonMessage extends BaseJsonMessage {
    type?: "nbt";
    nbt: string;
    interpret?: boolean;
    separator?: JsonMessage;
}

interface BlockNbtJsonMessage extends NbtJsonMessage {
    source?: "block";
    block: string;
}

interface EntityNbtJsonMessage extends NbtJsonMessage {
    source?: "entity";
    entity: string;
}

interface StorageNbtJsonMessage extends NbtJsonMessage {
    source?: "storage";
    storage: string;
}

export type JsonMessage =
    | string
    | TextJsonMessage
    | SelectorJsonMessage
    | KeybindJsonMessage
    | TranslateJsonMessage
    | ScoreboardJsonMessage
    | NbtJsonMessage
    | BlockNbtJsonMessage
    | EntityNbtJsonMessage
    | StorageNbtJsonMessage
    | JsonMessage[];

export function interpretMessage(message: JsonMessage): string {
    if (typeof message === "string") {
        return message;
    }

    if ("text" in message) {
        return message.text;
    }

    if ("selector" in message) {
        return message.selector;
    }

    if ("keybind" in message) {
        return `<${message.keybind}>`;
    }

    if ("translate" in message) {
        return interpretTranslation(message);
    }

    if ("score" in message) {
        return `<${message.score.name}->${message.score.objective}>`;
    }

    if ("nbt" in message) {
        return `${message.nbt}`;
    }

    if (Array.isArray(message)) {
        return message.map(interpretMessage).join("");
    }

    // this return is to catch any missing cases but it should never be reached.
    // if there is an unhandled case, the type of message will no longer be `never`
    // so it will be caught by the type system.
    return message;
}

function interpretTranslation(message: TranslateJsonMessage): string {
    const args = message.with?.map(interpretMessage) ?? [];

    const findArg = (n: number) => args[n] ?? `%${n + 1}$s`;

    const getIndex = (match: RegExpExecArray) => {
        if (match[1]) {
            return argIndex++;
        }

        if (match[2]) {
            return parseInt(match[2]) - 1;
        }

        throw new Error("Invalid match");
    };

    const text = message.translate;
    const matcher = /(%s)|%(\d+)\$s/g;
    const buffer = [];
    let cursor = 0;
    let argIndex = 0;

    while (true) {
        const matchArray = matcher.exec(text);

        if (!matchArray) {
            break;
        }

        buffer.push(text.substring(cursor, matchArray.index));
        buffer.push(findArg(getIndex(matchArray)));

        cursor = matchArray.index + matchArray[0].length;
    }

    buffer.push(text.substring(cursor));

    return buffer.join("");
}

const DEFUALT_COMMANDS = [
    `tellraw <selector> <message>`,
    `title <selector> <position> <message>`,
    `bossbar add <id> <message>`,
    `bossbar set <id> name <message>`,
];

class CommandProcessor {
    private cursor = 0;
    private commands: Command[];

    constructor(commands: string[] = DEFUALT_COMMANDS) {
        this.commands = commands.map(parseSyntax);
    }

    match(text: string): Syntax {
        const tokens = this.tokenized(text);

        for (const command of this.commands) {
            const result = this.matchCommand(tokens, command);

            if (result) {
                return { command: text, valid: true, args: result };
            }
        }

        return { command: text, valid: false, args: {} };
    }

    tokenized(text: string): string[] {
        const lexer = new CommandLexer(text);

        const buffer = [];

        while (!lexer.isEnd) {
            const part = lexer.getToken();

            if (part !== "") {
                buffer.push(part);
            }
        }

        return buffer;
    }

    matchCommand(tokens: string[], command: Command) {
        if (tokens.length !== command.length) {
            return null;
        }

        const args: Record<string, string> = {};

        for (let i = 0; i < command.length; i++) {
            const part = command[i];
            const arg = tokens[i];

            if (part.type === "literal") {
                if (part.value !== arg) {
                    return null;
                }

                continue;
            }

            if (part.type === "argument") {
                args[part.name] = arg;
                continue;
            }
        }

        return args;
    }
}

type Command = CommandPart[];

type CommandPart =
    | { type: "literal"; value: string }
    | { type: "argument"; name: string; optional: boolean };

function parseSyntax(command: string): CommandPart[] {
    const parts = command.trim().split(" ");

    return parts.map((part) => {
        const required = part.match(/<(\w+)>/);
        if (required) {
            const name = required[1];
            return { type: "argument", name, optional: false };
        }

        const optional = part.match(/\\[(\w+)\\]/);
        if (optional) {
            const name = optional[1];
            return { type: "argument", name, optional: true };
        }

        return { type: "literal", value: part };
    });
}

interface Checkpoint {
    index: number;
}

class CommandLexer {
    private cursor = 0;

    constructor(private readonly text: string) {
        if (text.startsWith("$")) {
            // parse the command as a function macro
            this.cursor++;
        }
    }

    get length() {
        return this.text.length;
    }

    get isEnd() {
        return this.cursor >= this.text.length;
    }

    peek(n: number = 0): string {
        if (this.cursor + n >= this.text.length) {
            return "";
        }

        return this.text[this.cursor + n];
    }

    checkpoint(): Checkpoint {
        return { index: this.cursor };
    }

    recover(checkpoint: Checkpoint) {
        this.cursor = checkpoint.index;
    }

    resolve(checkpoint: Checkpoint): string {
        return this.text.substring(checkpoint.index, this.cursor);
    }

    check(text: string, n: number = 0): boolean {
        return this.peek(n) === text;
    }

    expect(text: string) {
        const marker = this.checkpoint();

        for (const char of text) {
            if (this.peek() !== char) {
                this.recover(marker);
                throw new Error(`Expected ${text}`);
            }

            this.next();
        }
    }

    expectAny(list: string[]) {
        const marker = this.checkpoint();

        for (const choice of list) {
            try {
                this.expect(choice);
                return;
            } catch {
                this.recover(marker);
                continue;
            }
        }

        throw new Error(`Expected any of ${list}`);
    }

    repeating({
        content,
        separator,
    }: {
        content: () => void;
        separator: () => void;
    }) {
        const marker = this.checkpoint();

        while (!this.isEnd) {
            this.skipWhitespace();
            try {
                content();
            } catch {}

            if (this.isEnd) {
                break;
            }

            this.skipWhitespace();

            try {
                separator();
            } catch {
                return this.resolve(marker);
            }
        }

        return this.resolve(marker);
    }

    alternate(choices: (() => string)[]): string {
        const marker = this.checkpoint();

        for (const choice of choices) {
            try {
                return choice();
            } catch {
                this.recover(marker);
            }
        }

        throw new Error("No valid choice");
    }

    skip(predicate: (char: string) => boolean) {
        const marker = this.checkpoint();

        while (predicate(this.peek()) && !this.isEnd) {
            this.next();
        }

        return this.resolve(marker);
    }

    skipWhitespace() {
        return this.skip((char) => /\s/.test(char));
    }

    skipUntil(text: string) {
        return this.skip((char) => char !== text);
    }

    next(): string {
        return this.text[this.cursor++];
    }

    getToken(): string {
        this.skipWhitespace();
        const c = this.peek();

        switch (c) {
            case "":
                return "";
            case "#":
                return this.nextComment();
            case '"':
                return this.nextString();
            case "{":
                return this.nextObject();
            case "[":
                return this.nextArray();
            case "@":
                return this.nextSelector();
            default:
                return this.nextWord();
        }
    }

    nextComment(): string {
        const marker = this.checkpoint();
        this.expect("#");

        this.skipUntil("\n");

        return this.resolve(marker);
    }

    nextWord(): string {
        const literal = /[a-zA-Z0-9_\-:]/;

        const marker = this.checkpoint();

        while (literal.test(this.peek())) {
            this.next();
        }

        if (marker.index === this.cursor) {
            throw new Error("Expected a word");
        }

        return this.resolve(marker);
    }

    nextSelector(): string {
        const marker = this.checkpoint();
        this.expect("@");
        this.expectAny(["a", "e", "p", "r", "s", "n"]);

        if (this.check("[")) {
            this.expect("[");

            this.repeating({
                content: () => this.selectorAttribute(),
                separator: () => this.expect(","),
            });

            this.expect("]");
        }

        return this.resolve(marker);
    }

    selectorAttribute() {
        this.nextWord();
        this.skipWhitespace();
        this.expect("=");
        this.skipWhitespace();

        this.alternate([
            () => this.nextWord(),
            () => this.nextString(),
            () => this.nextObject(),
            () => this.nextArray(),
        ]);
    }

    nextString() {
        const marker = this.checkpoint();

        this.expect('"');

        while (this.peek() !== '"' && !this.isEnd) {
            if (this.peek() === "\\") {
                this.next();
            }

            this.next();
        }

        this.expect('"');

        return this.resolve(marker);
    }

    nextJson() {
        this.alternate([
            () => this.nextObject(),
            () => this.nextArray(),
            () => this.nextString(),
            () => this.nextWord(),
        ]);
    }

    nextObject() {
        const marker = this.checkpoint();

        this.expect("{");
        this.repeating({
            separator: () => this.expect(","),
            content: () => {
                this.skipWhitespace();

                this.alternate([
                    () => this.nextWord(),
                    () => this.nextString(),
                ]);

                this.skipWhitespace();
                this.expect(":");
                this.skipWhitespace();

                this.nextJson();
            },
        });
        this.expect("}");

        return this.resolve(marker);
    }

    nextArray() {
        const marker = this.checkpoint();

        this.expect("[");
        this.repeating({
            separator: () => this.expect(","),
            content: () => {
                this.skipWhitespace();
                this.nextJson();
                this.skipWhitespace();
            },
        });
        this.expect("]");

        return this.resolve(marker);
    }
}

interface Syntax {
    command: string;
    valid: boolean;
    args: Record<string, string>;
}
