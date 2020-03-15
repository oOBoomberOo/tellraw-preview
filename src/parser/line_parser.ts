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
			if (this.isAlphabetic(token)) {
				const parse_result = new CommandParser().parse(reader);
				result = result.concat(parse_result);
			}
			else if (this.isNumeric(token)) {
				const parse_result = new NumberParser().parse(reader);
				result = result.concat(parse_result);
			}
			else if (token === '@') {
				const parse_result = new SelectorParser().parse(reader);
				result = result.concat(parse_result);
			}
			else if (token === '{' || token === '[' || token === `"` || token === `'`) {
				const parse_result = new NbtParser().parse(reader);
				result = result.concat(parse_result);
			}
			else {
				// Panic!
				break;
			}
		}

		return result;
	}
}