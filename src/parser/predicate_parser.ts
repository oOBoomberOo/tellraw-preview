import Parser from './parser';
import Reader from './reader';
import { Token } from './token';
import NbtParser from './nbt_parser';

export default class PredicateParser extends Parser {
	parse(reader: Reader): Token[] {
	 	const [token] = new NbtParser().parse(reader);
		return Token.selector(token.value);
	}

}