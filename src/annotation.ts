import * as vscode from 'vscode';
import { TextEditor, DecorationOptions, DecorationRangeBehavior, window, Range, Disposable, ThemeColor } from 'vscode';
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
	translate?: string;
	score?: { name: string, objective: string, value?: string };
	selector?: string;
	keybind?: string;
	nbt?: string;
	extras?: Item[];
}

export class LineAnnotation implements Disposable {
	private _disposable: Disposable;
	private _editor: TextEditor | undefined;
	private commandWhitelist: string[] = ["tellraw", "say", "tell", "msg", "w", "me", "teammsg", "tm", "title"];

	constructor() {
		this._disposable = Disposable.from(
			vscode.workspace.onDidChangeTextDocument(this.onDidChange, this)
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
					const range = new Range(line.range.end, line.range.end);
					const decoration = this.haveWhitelistedCommand(significantToken, range);
					if (decoration !== null) {
						decorations.push(decoration);
					}
				}
			}
		}
		editor.setDecorations(annotationDecoration, decorations);
	}

	// VS Code's Markdown String will not render empty line
	fillLineIfEmpty(value: string): string {
		if (value) {
			return value;
		}
		else {
			return " ";
		}
	}

	haveWhitelistedCommand(tokens: Token[], range: Range): DecorationOptions | null {
		try {
			const [command, ...rest] = tokens;
			if (command.value === 'tellraw') {
				const [message] = rest.slice(3);
				if (!message) {
					return null;
				}

				const parsedMessage = JSON.parse(message.value);
				const builtMessage = this.buildMessage(parsedMessage);
				const contentText = `=> ${builtMessage.replace(/\n/g, '\\n')}`;
				const renderOptions = { after: { contentText, color: new ThemeColor("tellraw_preview.previewColor"), fontStyle: 'regular' } };
				const hoverMessage = this.sanitizeMessage(builtMessage).split('\n').map(this.fillLineIfEmpty);
				const decoration = { renderOptions, hoverMessage, range };

				return decoration;
			} else if (['tell', 'msg', 'w'].includes(command.value)) {
				const message = rest.filter(v => v.kind !== TokenKind.Whitespace).slice(1).map(v => v.value).join('');
				if (!message) {
					return null;
				}

				const renderOptions = { after: { contentText: `=> ${message}`, color: new ThemeColor("tellraw_preview.previewColor"), fontStyle: 'italic' } };
				const hoverMessage = this.sanitizeMessage(message).split('\n').map(this.fillLineIfEmpty);
				const decoration = { renderOptions, hoverMessage, range };
				return decoration;
			} else if (command.value === 'say') {
				const message = rest.slice(1).map(v => v.value).join('');
				if (!message) {
					return null;
				}
				
				const renderOptions = { after: { contentText: `=> ${message}`, color: new ThemeColor("tellraw_preview.previewColor"), fontStyle: 'regular' } };
				const hoverMessage = this.sanitizeMessage(message).split('\n').map(this.fillLineIfEmpty);
				const decoration = { renderOptions, hoverMessage, range };
				return decoration;
			} else if (command.value === 'me') {
				const message = rest.slice(1).map(v => v.value).join('');
				if (!message) {
					return null;
				}
				
				const renderOptions = { after: { contentText: `=> * ${message}`, color: new ThemeColor("tellraw_preview.previewColor"), fontStyle: 'regular' } };
				const hoverMessage = `\\* ${this.sanitizeMessage(message)}`;
				const decoration = { renderOptions, hoverMessage, range };
				return decoration;
			} else if (["teammsg", "tm"].includes(command.value)) {
				const message = rest.slice(1).map(v => v.value).join('');
				if (!message) {
					return null;
				}

				const renderOptions = { after: { contentText: `=> ${message}`, color: new ThemeColor("tellraw_preview.previewColor"), fontStyle: 'regular' } };
				const hoverMessage = this.sanitizeMessage(message);
				const decoration = { renderOptions, hoverMessage, range };
				return decoration;
			} else if (command.value === 'title') {
				const test = rest.filter(v => v.kind !== TokenKind.Whitespace);
				const [ selector, mode, message ] = test;
				if (!message || !mode || !selector) {
					return null;
				}
				if (!["title", "subtitle", "actionbar"].includes(mode.value)) {
					return null;
				}

				const parsedMessage = JSON.parse(message.value);
				const builtMessage = this.buildMessage(parsedMessage);
				const renderOptions = { after: { contentText: `=> ${builtMessage}`, color: new ThemeColor("tellraw_preview.previewColor"), fontStyle: 'regular' } };
				const hoverMessage = this.sanitizeMessage(builtMessage);
				const decoration = { renderOptions, hoverMessage, range };
				return decoration;
			} else {
				return null;
			}
		} catch (error) {
			return {
				renderOptions: {
					after: {
						contentText: `Δ ${error.message}`,
						color: new ThemeColor("tellraw_preview.errorColor"),
						fontStyle: 'italic'
					}
				},
				range
			};
		}
	}

	// Check if the given line contain any whitelisted commands
	// This can be true if a part of the command is whitelisted as well
	containWhitelistCommand(content: string): boolean {
		return this.commandWhitelist.some(command => content.includes(command));
	}

	checkToken({ kind, value }: Token): boolean {
		return kind === TokenKind.Command && this.allowPreview(value);
	}

	// Check if the given command is in the whitelist
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
		this.clearAnnotations(this._editor);
		this._disposable.dispose();
	}

	// Build /tellraw message from JSON data
	buildMessage(value: Item | Item[] | string): string {
		if (Array.isArray(value)) {
			return value.map(this.buildMessage, this).join("");
		}
		else if (typeof value === "string") {
			return value;
		}
		else {
			if (value.text) {
				return value.text + this.buildMessage(value.extras || []);
			}
			else if (value.translate) {
				return value.translate + this.buildMessage(value.extras || []);
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
			else if (value.keybind) {
				return `<${value.keybind}>` + this.buildMessage(value.extras || []);
			}
			else if (value.nbt) {
				return `<${value.nbt}>` + this.buildMessage(value.extras || []);
			}
			else {
				return this.buildMessage(value.extras || []);
			}
		}
	}

	// Sanitize message for Markdown text
	sanitizeMessage(message: string): string {
		return message
			.replace(/</g, '\\<')
			.replace(/>/g, '\\>')
			.replace(/\*/g, '\\*');
	}
}
