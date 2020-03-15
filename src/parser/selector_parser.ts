import Parser from './parser';
import Reader from './reader';
import { Token, TokenKind } from './token';
import PredicateParser from './predicate_parser';

export default class SelectorParser extends Parser {
	parse(reader: Reader): Token[] {
		let buffer = "";
		// Gauranteed to be '@'
		buffer += reader.next();

		const selector = reader.next();
		if (!this.isAlphabetic(selector)) {
			return Token.error(selector);
		}
		buffer += selector;

		while (!reader.isEndOfFile) {
			const token = reader.peek();
			
			if (token === '[') {
				const [token] = new PredicateParser().parse(reader);
				buffer += token.value;
			}
			else if (this.isWhitespace(token)) {
				break;
			}
		}

		return Token.selector(buffer);
	}
}