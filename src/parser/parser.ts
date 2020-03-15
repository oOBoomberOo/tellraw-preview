import Reader from './reader';
import { Token } from './token';

export default abstract class Parser {
	public abstract parse(reader: Reader): Token[];

	public isAlphabetic(token: string): boolean {
		return /[a-zA-Z]/.test(token);
	}

	public isNamespace(token: string): boolean {
		return /[a-zA-Z:/\-_]/.test(token);
	}

	public isNumeric(token: string): boolean {
		return /[\^~0-9\.\-]/.test(token);
	}

	public isWhitespace(token: string): boolean {
		return /[\s\n\r]/.test(token);
	}

	public isQuote(token: string): boolean {
		return token === `"` || token === `'`;
	}
}