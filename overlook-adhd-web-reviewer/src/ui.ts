import { CancellationToken, WebviewView, WebviewViewProvider, WebviewViewResolveContext, Uri, workspace, window } from "vscode";
import { Scanner } from "./scanner";
import { Suggestions } from "./registry";

type IconName = 'chrome' | 'edge' | 'firefox' | 'safari'

enum EventMessageCommand {
    START_SCAN = "startScan",
    SCAN_IN_PROGRESS = "scanInProgress",
    SCAN_COMPLETED = "scanCompleted",
    CREATE_JIRA = "createJira",
}

interface EventMessage {
    command: EventMessageCommand;
}

export class ExtensionViewProvider implements WebviewViewProvider {
    public static readonly viewType = 'overlook.mainView';

    private _view?: WebviewView;

    constructor(
        private readonly _extensionUri: Uri,
        private readonly _scanner: Scanner,
        private readonly _suggestions: Suggestions,
        private readonly _webFeaturesData: any,
    ) { }

    private iconUri(name: IconName): Uri | undefined {
        return this._view?.webview.asWebviewUri(Uri.joinPath(this._extensionUri, "media", `${name}_32x32.png`));
    }

    resolveWebviewView(webviewView: WebviewView, context: WebviewViewResolveContext, token: CancellationToken): Thenable<void> | void {
        this._view = webviewView;
        this._view.webview.onDidReceiveMessage((message: EventMessage) => {
            if (message.command === EventMessageCommand.START_SCAN) {
                console.log("event received: start the scan");
                this._view?.webview.postMessage({ command: EventMessageCommand.SCAN_IN_PROGRESS });
                this._scanner.start().then((featuresFound) => {
                    console.log("event sent: completed the scan");
                    this._view?.webview.postMessage({
                        command: EventMessageCommand.SCAN_COMPLETED,
                        featuresFound: this._scanner.featuresFound,
                    });
                });
            } else if (message.command === EventMessageCommand.CREATE_JIRA) {
                console.log("event received: create JIRA ticket");
                this.createJiraDocument(this._scanner.featuresFound);
            }
        });
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri, Uri.joinPath(this._extensionUri, 'media')],
        };
        const scriptsFile = webviewView.webview.asWebviewUri(Uri.joinPath(this._extensionUri, 'media', 'scripts.js'));
        const stylesFile = webviewView.webview.asWebviewUri(Uri.joinPath(this._extensionUri, 'media', 'styles.css'));
        webviewView.webview.html = `<!DOCTYPE html>
        <html lang="en">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Overlook</title>
        <meta http-equiv="Content-Security-Policy" content="img-src ${this._view.webview.cspSource};">
        <link rel="stylesheet" href="${stylesFile}" />
        </head>
        <body>
        <h1>Overlook Review</h1>
        <div class="page">
            ${this.renderPage()}
        </div>
        <script>
            window.iconFragments = {
                chrome: "${this.iconUri('chrome')}",
                chrome_android: "${this.iconUri('chrome')}",
                firefox: "${this.iconUri('firefox')}",
                firefox_android: "${this.iconUri('firefox')}",
                safari: "${this.iconUri('safari')}",
                safari_ios: "${this.iconUri('safari')}",
                edge: "${this.iconUri('edge')}",
            };
            window.EventMessageCommand = ${JSON.stringify(EventMessageCommand)};
        </script>
        <script type="text/javascript" src="${scriptsFile}"></script>
        </body></html>
        `;
    }

    private renderSuggestions(): string {
        let output = '<div class="suggestions"><h2>Suggestions</h2>';
        for (let suggestion of Object.values(this._suggestions)) {
            output += `
            <div class="suggestion">
            <h3 class="title">${suggestion.title}</h3>
            <div class="overview">${suggestion.overview}</div>
            <div class="description">${this._webFeaturesData["features"][suggestion.descriptionFeatureId]["description_html"]}</div>
            </div>
            `;
        }
        return output + '</div>';
    }

    private renderPage(): string {
        let output = `
        ${this.renderButtons()}
        <div id="results"></div>
        <div id="suggestions">${this.renderSuggestions()}</div>
        `;
        return output;
    }

    private renderButtons(): string {
        return `
        <div id="buttons">
            <button id="scan">Scan</button>
            <button id="create-jira" style="display: none;">Create JIRA Ticket</button>
        </div>
        `;
    }

    private async createJiraDocument(featuresFound: any[]): Promise<void> {
        const browsers = ['chrome', 'firefox', 'edge', 'safari'];
        const mobileBrowsers = ['chrome_android', 'firefox_android', 'safari_ios'];
        
        let content = `# Overlook - Jira Ticket
## Title:
Review web features

## Description:
User Story: As a developer, I want to ensure we are using modern web features for a great user experience.

This ticket addresses ${featuresFound.length} potential browser compatibility issue(s) identified in the codebase.

### Acceptance Criteria
For each web feature, investigate whether it is an issue by checking browser support versions, and then choose a resolution path, either refactor the code or backlog or take no action.

`;

        for (const featureFound of featuresFound) {
            content += `#### Web Feature: \`${featureFound.feature.title}\`
**Support Level:** ${featureFound.baselineSupportLevel}

**Supported Since:** ${featureFound.baselineSupportDate}

**Description:** ${featureFound.description}

**Browser Support:**
- Desktop:
${browsers.map(browser => `  - ${browser}: ${featureFound.browsers?.[browser] || 'Unknown'}\n`).join('')}
- Mobile:
${mobileBrowsers.map(browser => `  - ${browser}: ${featureFound.browsers?.[browser] || 'Unknown'}\n`).join('')}

**Affected Files:**
${featureFound.locations.map((location: any) => `- \`${location.filePath}\`\n`).join('')}
`;
            if (featureFound.feature.spec) {
                content += `**Specification:** ${featureFound.feature.spec}\n\n`;
            }
        }
        content += '## Acceptance Criteria\n\n';
        featuresFound.forEach(feature => {
            content += `- [ ] Review usage of "${feature.feature.title}" in affected files
- [ ] Ensure browser compatibility meets project requirements
- [ ] Add polyfills or alternatives if needed
- [ ] Update documentation with browser support notes
`;
        });
        content += '## References\n\n';
        for (let featureFound of featuresFound) {
            if (featureFound.feature.mdn_url) {
                content += `- [${featureFound.feature.title} - MDN](${featureFound.feature.mdn_url})\n`;
            }
            if (featureFound.feature.spec) {
                content += `- [${featureFound.feature.title} - Specification](${featureFound.feature.spec})\n`;
            }
        }

        const doc = await workspace.openTextDocument({ content, language: 'markdown'});
        
        await window.showTextDocument(doc);
    }
}
