import * as vscode from 'vscode';
import { TextEditor, DecorationOptions, DecorationRangeBehavior, window, Range, Disposable } from 'vscode';

const annotationDecoration = window.createTextEditorDecorationType({
	after: {
		margin: '0 0 0 1rem',
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

		const decorations: DecorationOptions[] = [];
		for (let i = 0; i < lines; i++) {
			const line = editor.document.lineAt(i);
			const content = line.text;
			
			if (content.startsWith("tellraw")) {
				const matches = content.match(/\[.+\]|{.+}|".+"/);
				const messages: Item[] = matches?.map(jsonMapper) as Item[];
				const position = line.range.end;

				for (const message of messages) {
					const content = buildMessage(message);
					const range = new Range(position, position);
					const decoration: DecorationOptions = {
						renderOptions: {
							after: {
								contentText: `=> ${content}`,
								color: "gray"
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
	score?: { name: string, objective: string, value?: string};
	selector?: string;
	extras?: Item[];
}

function buildMessage(value: Item | Item[]): string {
	if (Array.isArray(value)) {
		return value.map(buildMessage).join("");
	}
	else if (typeof value === "string") {
		return value as string;
	}
	else {
		if (value.text) {
			return value.text + buildMessage(value.extras || []);
		}
		else if (value.translated) {
			return value.translated + buildMessage(value.extras || []);
		}
		else if (value.score) {
			if (value.score.value) {
				return value.score.value.toString() + buildMessage(value.extras || []);
			}
			else {
				const name = value.score.name || "scoreboard";
				const objective = value.score.objective || "objective";
				return `<${name}:${objective}>` + buildMessage(value.extras || []);
			}
		}
		else if (value.selector) {
			return `<${value.selector}>` + buildMessage(value.extras || []);
		}
		else {
			return buildMessage(value.extras || []);
		}
	}
}

// tellraw @s [{"text": "Hello", "color": "aqua"}, {"text": ", "}, {"text": "World", "color": "red"}]