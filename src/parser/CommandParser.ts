import { Parser, escape } from "./AbstractParser";
import { ParsingError } from "./ParsingError";

export function parseFunction(input: string): Command[] {
    return new CommandParser(input).parse();
}

export class CommandParser extends Parser {
    literal(f: () => void): Node {
        const c = this.checkpoint();
        f();
        return { type: "literal", content: c.commit(), index: c.index };
    }

    parse(): Command[] {
        const buffer = [];

        while (!this.isEnd) {
            try {
                buffer.push(this.command());
            } catch (e) {
                if (e instanceof ParsingError) {
                    break;
                }

                throw e;
            }
        }

        return buffer;
    }

    command(): Command {
        const result: Node[] = [];
        const c = this.checkpoint();

        try {
            switch (this.current) {
                case "$":
                    return this.macro();
                case "#":
                    return this.comment();
            }

            this.try(() => this.endOfLine());

            while (!this.isEnd) {
                result.push(this.token());
                this.space();
            }
        } catch (e) {
            if (e instanceof EndOfLineError) {
                return {
                    command: c.commit().trim(),
                    node: result,
                };
            }

            throw e;
        }

        return {
            command: c.commit().trim(),
            node: result,
        };
    }

    token() {
        return this.alternative(
            () => this.object(),
            () => this.array(),
            () => this.string(),
            () => this.selector(),
            () => this.word()
        );
    }

    word(): Node {
        // anything that isn't a space can be part of a word
        const index = this.cursor;
        return {
            type: "literal",
            content: this.regex(/[^\s\{\}\[\]=]/),
            index,
        };
    }

    selector(): Node {
        const c = this.checkpoint();

        this.expect("@");
        this.expectRegex(/[a-z]/);

        if (this.check("[")) {
            this.selectorArguments();
        }

        return { type: "selector", content: c.commit(), index: c.index };
    }

    selectorArguments() {
        this.expect("[");

        this.repeating(() => {
            this.space();
            this.word();
            this.space();
            this.expect("=");
            this.space();
            this.nbt();
        }, this.separator());

        this.expect("]");
    }

    comment(): Command {
        const c = this.checkpoint();
        this.space();
        this.expect("#");
        this.takeUntil((c) => c === "\n");
        this.try(() => this.expect("\n"));
        return {
            command: c.commit(),
            node: [{ type: "comment", content: c.commit(), index: c.index }],
        };
    }

    macro(): Command {
        this.expect("$");
        return this.command();
    }

    nbt(): Node {
        return this.alternative(
            () => this.object(),
            () => this.array(),
            () => this.string(),
            () => this.selector(),
            () => this.word()
        );
    }

    array(): Node {
        const c = this.checkpoint();

        this.expect("[");

        const elements = this.repeating(() => {
            this.space();
            const node = this.nbt();
            this.space();
            return node;
        }, this.separator());

        this.expect("]");

        return { type: "array", content: c.commit(), elements, index: c.index };
    }

    object(): Node {
        const c = this.checkpoint();
        const left = this.literal(() => this.expect("{"));
        const elements = this.repeating(() => {
            this.space();
            const key = this.objectKey();
            this.space();
            const separator = this.literal(() => this.expect(":"));
            this.space();
            const result = this.nbt();
            this.space();
            return [key, separator, result];
        }, this.separator());
        const right = this.literal(() => this.expect("}"));
        return {
            type: "object",
            content: c.commit(),
            elements: [left, ...elements.flat(), right],
            index: c.index,
        };
    }

    objectKey(): Node {
        return this.alternative(
            () => {
                const c = this.checkpoint();
                this.regex(/[a-zA-Z0-9_]/);
                return { type: "literal", content: c.commit(), index: c.index };
            },
            () => this.string()
        );
    }

    string(): Node {
        const c = this.checkpoint();
        this.expect('"');
        while (!this.isEnd) {
            if (this.check("\\") && this.check('"', 1)) {
                this.advance();
                this.advance();
                continue;
            }

            if (this.check('"')) {
                break;
            }

            this.advance();
        }
        this.expect('"');
        return { type: "string", content: c.commit(), index: c.index };
    }

    separator() {
        return () => this.expectOneOf([",", ":", "="]);
    }

    multiline() {
        this.expect("\\");
        this.regex(/[ \t]/, 0);
        this.newline();
        this.space();
    }

    newline() {
        return this.expectOneOf(["\n", "\r\n"]);
    }

    endOfLine() {
        this.newline();
        throw new EndOfLineError(this.cursor);
    }

    space() {
        this.regex(/[ \t]/, 0);
        this.alternative(
            () => this.multiline(),
            () => this.endOfLine(),
            () => {}
        );
    }
}

class EndOfLineError extends Error {
    constructor(public readonly index: number) {
        super("End of line");
    }
}

export interface Command {
    command: string;
    node: Node[];
}

export type Node =
    | { type: "comment"; content: string; index: number }
    | { type: "literal"; content: string; index: number }
    | { type: "string"; content: string; index: number }
    | { type: "array"; content: string; index: number; elements: Node[] }
    | { type: "object"; content: string; index: number; elements: Node[] }
    | { type: "selector"; content: string; index: number };
