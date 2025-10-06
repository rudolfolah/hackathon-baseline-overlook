// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { ExtensionViewProvider } from './ui';
import { Scanner } from './scanner';
import { suggestions } from './registry';

function loadWebFeaturesData(context: vscode.ExtensionContext): Object {
    const localPath = path.join(context.extensionPath, 'data.json');
    if (fs.existsSync(localPath)) {
        return JSON.parse(fs.readFileSync(localPath, 'utf8'));
    }
    const nodeModulesPath = path.join(context.extensionPath, 'node_modules', 'web-features', 'data.json');
    return JSON.parse(fs.readFileSync(nodeModulesPath, 'utf8'));
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const webFeaturesData = loadWebFeaturesData(context);
    const scanner = new Scanner(webFeaturesData);
    const startViewProvider = new ExtensionViewProvider(context.extensionUri, scanner, suggestions, webFeaturesData);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ExtensionViewProvider.viewType, startViewProvider)
    );

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "overlook-adhd-web-reviewer" is now active!');
    console.debug(webFeaturesData);

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    const disposable = vscode.commands.registerCommand(
        'overlook-adhd-web-reviewer.startScan',
        () => {
            // The code you place here will be executed every time your command is executed
            // Display a message box to the user
            vscode.window.showInformationMessage('Overlook scan started');
            scanner.start();
            vscode.window.showInformationMessage('Overlook Scan completed');
        });

    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }
