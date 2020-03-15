export enum TokenKind {
	Command,
	Selector,
	Nbt,
	Number,
	Error,
	Whitespace,
	// Any other string value that is not part of the above enums
	String
}

export class Token {
	readonly value: string;
	readonly kind: TokenKind;

	constructor(value: string, kind: TokenKind) {
		this.value = value;
		this.kind = kind;
	}
	
	static error(value: string): Token[] {
		return [new Token(value, TokenKind.Error)];
	}

	static command(value: string): Token[] {
		return [new Token(value, TokenKind.Command)];
	}

	static selector(value: string): Token[] {
		return [new Token(value, TokenKind.Selector)];
	}

	static nbt(value: string): Token[] {
		return [new Token(value, TokenKind.Nbt)];
	}

	static number(value: string): Token[] {
		return [new Token(value, TokenKind.Number)];
	}

	static whitespace(value: string): Token[] {
		return [new Token(value, TokenKind.Whitespace)];
	}

	static string(value: string): Token[] {
		return [new Token(value, TokenKind.String)];
	}
}