// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { LineAnnotation } from './annotation';

export function activate(context: vscode.ExtensionContext) {
	const disposable = new LineAnnotation();
	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}