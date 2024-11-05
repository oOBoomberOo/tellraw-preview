// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { JsonMessagePreview } from "./JsonMessagePreview";

export function activate(context: vscode.ExtensionContext) {
    const disposable = new JsonMessagePreview();
    context.subscriptions.push(disposable);
}
