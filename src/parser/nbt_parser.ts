import Parser from "./parser";
import Reader from "./reader";
import { Token } from "./token";

export default class NbtParser extends Parser {
	parse(reader: Reader): Token[] {
		return Token.nbt(this.parseNbt(reader));
	}

	parseNbt(reader: Reader): string {
		let buffer = "";

		const token = reader.peek();
		if (token === '[') {
			buffer += this.parseList(reader);
		}
		else if (token === '{') {
			buffer += this.parseObject(reader);
		}
		else if (this.isAlphabetic(token)) {
			buffer += this.parseKeyword(reader);
		}
		else if (this.isNumeric(token)) {
			buffer += this.parseNumber(reader);
		}
		else if (token === `'`) {
			buffer += this.parseSingleQuote(reader);
		}
		else if (token === `"`) {
			buffer += this.parseDoubleQuote(reader);
		}
		else {
			buffer += reader.next();
		}

		return buffer;
	}

	parseList(reader: Reader): string {
		let buffer = reader.next();
		while (!reader.isEndOfFile) {
			const token = reader.peek();

			if (token === ']') {
				buffer += reader.next();
				break;
			}
			else {
				buffer += this.parseNbt(reader);
			}
		}
		return buffer;
	}

	parseObject(reader: Reader): string {
		let buffer = reader.next();
		while (!reader.isEndOfFile) {
			const token = reader.peek();

			if (token === '}') {
				buffer += reader.next();
				break;
			}
			else {
				buffer += this.parseNbt(reader);
			}
		}
		return buffer;
	}

	parseDoubleQuote(reader: Reader): string {
		let buffer = reader.next();
		let isEscaping = false;
		while (!reader.isEndOfFile) {
			const token = reader.next();
			if (token === `\\`) {
				isEscaping = true;
				buffer += token;
			}
			
			if (!isEscaping && token === `"`) {
				buffer += token;
				break;
			}
			else {
				isEscaping = false;
				buffer += token;
			}
		}
		return buffer;
	}

	parseSingleQuote(reader: Reader): string {
		let buffer = reader.next();
		let isEscaping = false;
		while (!reader.isEndOfFile) {
			const token = reader.next();
			if (token === `\\`) {
				isEscaping = true;
				buffer += token;
			}
			
			if (!isEscaping && token === `'`) {
				buffer += token;
				break;
			}
			else {
				isEscaping = false;
				buffer += token;
			}
		}
		return buffer;
	}

	parseNumber(reader: Reader): string {
		let buffer = "";
		while (!reader.isEndOfFile) {
			const token = reader.peek();
			if (!this.isNumeric(token)) {
				break;
			}
			buffer += reader.next();
		}
		return buffer;
	}

	parseKeyword(reader: Reader): string {
		let buffer = "";
		while (!reader.isEndOfFile) {
			const token = reader.peek();
			if (!this.isAlphabetic(token)) {
				break;
			}
			buffer += reader.next();
		}

		return buffer;
	}
}