import Parser from "./parser";
import Reader from "./reader";
import { Token } from './token';
import CommandParser from "./command_parser";
import NumberParser from "./number_parser";
import SelectorParser from "./selector_parser";
import PredicateParser from "./predicate_parser";
import NbtParser from "./nbt_parser";

export default class LineParser extends Parser {
	private content: string;

	constructor(content: string) {
		super();
		this.content = content;
	}

	parse(): Token[] {
		const reader = new Reader(this.content);
		let result: Token[] = [];

		while (!reader.isEndOfFile) {
			const token = reader.peek();
			if (this.isNamespace(token)) {
				const [parse_result] = new CommandParser().parse(reader);
				result.push(parse_result);
			}
			else if (this.isNumeric(token)) {
				const [parse_result] = new NumberParser().parse(reader);
				result.push(parse_result);
			}
			else if (token === '@') {
				const [parse_result] = new SelectorParser().parse(reader);
				result.push(parse_result);
			}
			else if (token === '{' || token === '[' || token === `"` || token === `'`) {
				const [parse_result] = new NbtParser().parse(reader);
				result.push(parse_result);
			}
			else if (this.isWhitespace(token)) {
				const [parse_result] = Token.whitespace(token);
				reader.next();
				result.push(parse_result);
			}
			else if (this.isComment(token)) {
				break;
			}
			else {
				const [parse_result] = Token.string(token);
				reader.next();
				result.push(parse_result);
			}
		}

		return result;
	}
}