import * as vscode from 'vscode';
import { TextEditor, DecorationOptions, DecorationRangeBehavior, window, Range, Disposable } from 'vscode';
import LineParser from './parser/line_parser';
import { TokenKind, Token } from './parser/token';

const annotationDecoration = window.createTextEditorDecorationType({
	after: {
		margin: '0 0 0 1rem',
		textDecoration: 'none'
	},
	rangeBehavior: DecorationRangeBehavior.ClosedOpen
});

interface Item {
	text?: string;
	translated?: string;
	score?: { name: string, objective: string, value?: string};
	selector?: string;
	extras?: Item[];
}

export class LineAnnotation implements Disposable {
	private _disposable: Disposable;
	private _editor: TextEditor | undefined;
	private commandWhitelist: string[] = ["tellraw"];

	constructor() {
		this._disposable = Disposable.from(
			window.onDidChangeActiveTextEditor(this.onDidChange, this),
			window.onDidChangeTextEditorSelection(this.onDidChange, this)
		);
	}

	onDidChange() {
		this._editor = window.activeTextEditor;
		void this.refresh(window.activeTextEditor);
	}

	refresh(editor: TextEditor | undefined) {
		if (editor === undefined) {
			return;
		}
		if (!editor.document.isUntitled && !editor.document.fileName.endsWith(".mcfunction")) {
			return;
		}

		const lines = editor.document.lineCount || 0;

		const decorations: DecorationOptions[] = [];
		for (let i = 0; i < lines; i++) {
			const line = editor.document.lineAt(i);
			const content = line.text;
			
			if (this.containWhitelistCommand(content)) {
				const parser = new LineParser(content);
				const result = parser.parse();
				const index = result.findIndex(this.checkToken, this);
				if (index !== -1) {
					const significantToken = result.slice(index);
					const [_command, _selector, message] = significantToken;
					const parsedMessage = JSON.parse(message.value);
					const contentText = `=> ${this.buildMessage(parsedMessage)}`;
					const range = new Range(line.range.end, line.range.end);
					const decoration = {
						renderOptions: {
							after: {
								contentText,
								color: 'gray',
								fontStyle: 'normal'
							}
						},
						range
					};

					decorations.push(decoration);
				}
			}
		}
		editor.setDecorations(annotationDecoration, decorations);
	}

	containWhitelistCommand(content: string): boolean {
		return this.commandWhitelist.some(command => content.includes(command));
	}

	checkToken({ kind, value }: Token): boolean {
		return kind === TokenKind.Command && this.allowPreview(value);
	}

	allowPreview(command: string): boolean {
		return this.commandWhitelist.includes(command);
	}

	clearAnnotations(editor: TextEditor | undefined) {
		if (editor === undefined || (editor as any)._disposed === true) {
			return;
		}

		editor.setDecorations(annotationDecoration, []);
	}

	dispose() {
		console.log("Disposing");
		this.clearAnnotations(this._editor);
		this._disposable.dispose();
	}

	buildMessage(value: Item | Item[]): string {
		if (Array.isArray(value)) {
			return value.map(this.buildMessage).join("");
		}
		else if (typeof value === "string") {
			return value as string;
		}
		else {
			if (value.text) {
				return value.text + this.buildMessage(value.extras || []);
			}
			else if (value.translated) {
				return value.translated + this.buildMessage(value.extras || []);
			}
			else if (value.score) {
				if (value.score.value) {
					return value.score.value.toString() + this.buildMessage(value.extras || []);
				}
				else {
					const name = value.score.name || "scoreboard";
					const objective = value.score.objective || "objective";
					return `<${name}:${objective}>` + this.buildMessage(value.extras || []);
				}
			}
			else if (value.selector) {
				return `<${value.selector}>` + this.buildMessage(value.extras || []);
			}
			else {
				return this.buildMessage(value.extras || []);
			}
		}
	}
}
