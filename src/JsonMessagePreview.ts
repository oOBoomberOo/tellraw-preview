import {
    DecorationRangeBehavior,
    Disposable,
    TextDocument,
    window,
} from "vscode";
import * as vscode from "vscode";
import { parseFunction } from "./CommandParser";
import { showPreview } from "./MessagePreview";

const previewDecoration = window.createTextEditorDecorationType({
    after: {
        margin: "0 0 0 1rem",
        textDecoration: "none",
        color: new vscode.ThemeColor("tellraw_preview.previewColor"),
    },
    rangeBehavior: DecorationRangeBehavior.ClosedOpen,
});

export class JsonMessagePreview implements Disposable {
    private _disposable = Disposable.from(
        vscode.workspace.onDidChangeTextDocument(() => this.onDidChange()),
        vscode.window.onDidChangeActiveTextEditor(() => this.onDidChange())
    );

    get activeWindow() {
        return window.activeTextEditor;
    }

    onDidChange() {
        const editor = this.activeWindow;

        if (!editor) {
            return;
        }

        if (editor.document.languageId !== "mcfunction") {
            return;
        }

        try {
            this.previewDocument(editor);
        } catch (e) {
            console.error(e);
        }
    }

    previewDocument(editor: vscode.TextEditor) {
        const document = editor.document;
        const previewOptions = parseFunction(document).flatMap(showPreview);
        editor.setDecorations(previewDecoration, previewOptions);
        console.log("Previewing document");
    }

    dispose() {
        this._disposable.dispose();
    }
}
