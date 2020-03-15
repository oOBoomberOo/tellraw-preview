import Parser from './parser';
import Reader from './reader';
import { Token, TokenKind } from './token';

export default class NumberParser extends Parser {
	parse(reader: Reader): Token[] {
		let buffer = "";
		while (!reader.isEndOfFile) {
			const token = reader.next();
			if (!this.isNumeric(token)) {
				break;
			}
			buffer += token;
		}
		return [new Token(buffer, TokenKind.Number)];
	}
}