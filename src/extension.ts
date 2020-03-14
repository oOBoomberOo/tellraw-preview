// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { LineAnnotation } from './annotation';

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
	const command = vscode.commands.registerCommand("boomber.test", () => {
		vscode.window.showInformationMessage("OHAYOU SEKAI, GOOD MORNING WORLDDDDD!");
	});
	context.subscriptions.push(command);
	context.subscriptions.push(new LineAnnotation());
}

// this method is called when your extension is deactivated
export function deactivate() {}