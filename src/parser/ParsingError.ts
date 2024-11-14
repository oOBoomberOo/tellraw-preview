export class ParsingError extends Error {
    constructor(message: string, public readonly index: number) {
        super(message);
    }
}
