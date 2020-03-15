import Parser from './parser';
import Reader from './reader';
import { Token, TokenKind } from './token';

export default class CommandParser extends Parser {
	parse(reader: Reader): Token[] {
		let buffer = "";
		while (!reader.isEndOfFile) {
			const token = reader.next();
			if (!this.isNamespace(token)) {
				break;
			}

			buffer += token;
		}
		return [new Token(buffer, TokenKind.Command)];
	}
}