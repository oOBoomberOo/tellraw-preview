import { ParsingError } from "./ParsingError";

/**
 * Single character string.
 */
export type Char = string;

export function escape(str: string): string {
    return str.replace(/\n/, "\\n").replace(/\r/, "\\r");
}

export abstract class Parser {
    protected cursor: number = 0;

    constructor(protected readonly input: string) {}

    get length(): number {
        return this.input.length;
    }

    get current(): Char {
        if (this.isEnd) {
            return "";
        }

        return this.input[this.cursor];
    }

    get next(): Char {
        return this.input[this.cursor + 1];
    }

    get isEnd(): boolean {
        return this.cursor >= this.length;
    }

    protected peek(offset: number = 0): Char {
        if (this.cursor + offset >= this.input.length) {
            return "\0";
        }

        return this.input[this.cursor + offset];
    }

    protected advance(): Char {
        if (this.cursor >= this.input.length) {
            return "\0";
        }

        return this.input[this.cursor++];
    }

    /**
     * Peeks the next character and checks if it is the expected character.
     */
    protected check(char: Char, offset: number = 0): boolean {
        return this.peek(offset) === char;
    }

    /**
     * Throws a ParsingError with the given message.
     */
    protected error(message: string): never {
        throw new ParsingError(message, this.cursor);
    }

    /**
     * Creates a checkpoint that allows to recover the parser state to before the checkpoint was created.
     */
    protected checkpoint(): Checkpoint {
        const index = this.cursor;

        return {
            index,
            recover: () => {
                const consumed = this.input.slice(index, this.cursor);
                this.cursor = index;
                return consumed;
            },
            commit: () => {
                return this.input.slice(index, this.cursor);
            },
        };
    }

    /**
     * Executes the given block with a checkpoint as parameter and returns the result.
     */
    protected execute<T>(block: (checkpoint: Checkpoint) => T): T {
        const checkpoint = this.checkpoint();
        return block(checkpoint);
    }

    /**
     * Executes the given block with a checkpoint as parameter and returns the result.
     * If the block throws a ParsingError, the parser state is recovered and null is returned.
     */
    protected try<T>(block: (checkpoint: Checkpoint) => T): T | null {
        const checkpoint = this.checkpoint();

        try {
            return block(checkpoint);
        } catch (error) {
            if (error instanceof ParsingError) {
                checkpoint.recover();
                return null;
            }

            throw error;
        }
    }

    /**
     * Attempt to parse the input with the given parsers and return the first result that matched.
     */
    protected alternative<T>(...parsers: Parseable<T>[]): T {
        const checkpoint = this.checkpoint();

        for (const parser of parsers) {
            try {
                return parser();
            } catch (e) {
                if (e instanceof ParsingError) {
                    checkpoint.recover();
                    continue;
                }

                throw e;
            }
        }

        this.error(`No alternatives matched at ${this.cursor}`);
    }

    /**
     * Repeats the parser until it can no longer parse the input.
     */
    protected repeating<T>(
        parser: Parseable<T>,
        separator: Parseable<void> = () => this.whitespace()
    ): T[] {
        const results: T[] = [];

        const advanceParser = () => {
            const result = parser();
            results.push(result);
            return result;
        };

        const id = Math.random().toString(36).substring(7);

        while (!this.isEnd) {
            if (this.try(advanceParser) === null) {
                break;
            }

            if (this.try(separator) === null) {
                break;
            }
        }

        return results;
    }

    /**
     * Consumes the input until the predicate returns false and return the consumed string.
     */
    protected takeWhile(predicate: (char: Char) => boolean): string {
        return this.execute((checkpoint) => {
            while (predicate(this.current) && !this.isEnd) {
                this.advance();
            }

            return checkpoint.commit();
        });
    }

    /**
     * Consumes the input until the predicate returns true and return the consumed string.
     */
    protected takeUntil(predicate: (char: Char) => boolean): string {
        return this.takeWhile((char) => !predicate(char));
    }

    /**
     * Skips the input until the predicate returns false.
     */
    protected skipWhile(predicate: (char: Char) => boolean): void {
        this.takeWhile(predicate);
    }

    /**
     * Skips the input until the predicate returns true.
     */
    protected skipUntil(predicate: (char: Char) => boolean): void {
        this.takeUntil(predicate);
    }

    protected expect(text: string): string {
        const checkpoint = this.checkpoint();

        for (const char of text) {
            if (!this.check(char)) {
                const consumed = checkpoint.recover();
                this.error(
                    `Expected '${char}' in "${text}", got "${consumed}"`
                );
            }

            this.advance();
        }

        return checkpoint.commit();
    }

    protected expectOneOf(texts: string[]) {
        for (const text of texts) {
            try {
                return this.expect(text);
            } catch (e) {
                if (e instanceof ParsingError) {
                    continue;
                }

                throw e;
            }
        }

        this.error(
            `Expected one of '${texts
                .map(escape)
                .join("', '")}', but got '${escape(this.current)}'`
        );
    }

    protected expectRegex(regex: RegExp): string {
        const checkpoint = this.checkpoint();

        if (regex.test(this.current)) {
            this.advance();
            return checkpoint.commit();
        }

        const consumed = checkpoint.recover();
        this.error(`Expected ${regex}, got ${consumed}`);
    }

    /**
     * Consumes the input until regex no longer matches and returns the consumed string.
     * @param regex The regular expression to match. always match a single character.
     */
    protected regex(regex: RegExp, min: number = 1): string {
        const result = this.takeWhile((c) => regex.test(c));

        if (result.length < min) {
            this.error(`Expected ${regex} to match at least ${min} characters`);
        }

        return result;
    }

    /**
     * Skips whitespace characters.
     */
    protected whitespace() {
        const regex = /\s/;
        return this.skipWhile((c) => regex.test(c));
    }
}

/**
 * A parsing checkpoint object that allows to recover the parser state to before the checkpoint was created.
 */
export interface Checkpoint {
    index: number;
    /**
     * Recovers the parser state to the checkpoint.
     */
    recover(): string;
    /**
     * Commits the parser state and returns the consumed input.
     */
    commit(): string;
}

export type Parseable<T = string> = () => T;
