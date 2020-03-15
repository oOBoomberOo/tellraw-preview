export default class Reader {
	private cursor: number;
	private content: string;

	constructor(content: string) {
		this.cursor = 0;
		this.content = content;
	}

	public peek(): string {
		return this.content[this.cursor];
	}

	public next(): string {
		if (this.isEndOfFile) {
			return "";
		}
		return this.content[this.cursor++];
	}

	public get isEndOfFile(): boolean {
		return this.cursor >= this.content.length;
	}
}