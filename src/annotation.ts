import * as vscode from 'vscode';
import { TextEditor, DecorationOptions, DecorationRangeBehavior, window, Range, Disposable } from 'vscode';

const annotationDecoration = window.createTextEditorDecorationType({
	after: {
		textDecoration: 'none'
	},
	rangeBehavior: DecorationRangeBehavior.ClosedOpen
});

export class LineAnnotation implements Disposable {
	private _disposable: Disposable;
	private _editor: TextEditor | undefined;

	constructor() {
		this._disposable = Disposable.from(
			window.onDidChangeActiveTextEditor(this.onDidChange, this),
			window.onDidChangeTextEditorSelection(this.onDidChange, this),
		);
	}

	onDidChange() {
		void this.refresh(window.activeTextEditor);
	}

	refresh(editor: TextEditor | undefined) {
		if (editor === undefined) {
			return;
		}

		const lines = editor.document.lineCount || 0;

		// const decorations: DecorationOptions[] = [];
		for (let i = 0; i < lines; i++) {
			const line = editor.document.lineAt(i);
			const content = line.text;
			
			if (content.startsWith("tellraw")) {
				// console.log(content);
				const matches = content.match(/\[.+\]|{.+}|".+"/);
				const messages: Item[] = matches?.map(jsonMapper) as Item[];
				let start = line.range.end;

				for (const message of messages) {
					let decoration: DecorationOptions[] = [];
					
					decoration.push({
						renderOptions: {
							after: {
								contentText: " => ",
								color: "gray"
							}
						},
						range: editor.document.validateRange(
							new Range(start, start)
						)
					});
					
					const [pos, style] = applyStyle(message, start, editor);
					// start = pos;
					// console.log(style);
					decoration.push(...style);
					
					// decorations.push(...decoration);
					editor.setDecorations(annotationDecoration, decoration);
				}
			}
		}
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
}

function jsonMapper(value: string) {
	return JSON.parse(value);
}

interface Item {
	text?: string;
	translated?: string;
	extras?: Item[];
	color?: string;
	underlined?: boolean;
	bold?: boolean;
}

function applyStyle(value: Item | Item[], start: vscode.Position, editor: TextEditor): [vscode.Position, DecorationOptions[]] {
	if (Array.isArray(value)) {
		const decorations = [];
		let pos = start;
		for (const item of value) {
			const [new_pos, decoration] = applyStyle(item, pos, editor);
			pos = new_pos;
			decorations.push(...decoration);
		}

		return [pos, decorations];
	}
	else { 
		const message = value.text || value.translated || "";
		const color = value.color || "white";
		const bold = value.bold || false;
		const underlined = value.underlined || false;
		// const end = start.translate(0, message.length);
		const pos = start.translate(0, -1);
		const range = new Range(pos, pos);
		const result = {
			renderOptions: {
				after: {
					contentText: message,
					color,
					fontWeight: `${bold ? "bold": "normal"}`,
					textDecoration: `${underlined ? "underline": "none"}`
				}
			},
			range
		};
		return [pos, [result]];
	}
}

// tellraw @s [{"text": "Hello", "color": "aqua"}, {"text": ", "}, {"text": "World", "color": "red"}]