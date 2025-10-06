console.log("before the init script");
(function () {
    const vscode = acquireVsCodeApi();
    console.log("registering webview event handlers");
    function renderIcon(name, size) {
        return `<img src="${window.iconFragments[name]}" width="${size}" height="${size}" alt="${name} icon" />`;
    }
    const browsers = ['chrome', 'firefox', 'edge', 'safari'];
    const mobileBrowsers = ['chrome_android', 'firefox_android', 'safari_ios'];
    window.addEventListener('message', event => {
        const message = event.data;
        if (message.command === window.EventMessageCommand.SCAN_IN_PROGRESS) {
            console.log('webview, scan in progress');
        } else if (message.command === window.EventMessageCommand.SCAN_COMPLETED) {
            console.log('webview, scan completed');
            vscode.setState({ featuresFound: message.featuresFound });
            document.getElementById('create-jira').style.display = message.featuresFound.length > 0 ? 'inline-block' : 'none';
            const result = document.getElementById('results');
            console.log(message);
            result.innerHTML = '<h2>Review</h2>';
            for (let featureFound of message.featuresFound) {
                console.dir(featureFound);
                let html = '';
                html += '<div class="result">';
                html += '<h3>' + featureFound.feature.title + '</h3>';
                html += '<h4>Supported since ' + featureFound.baselineSupportDate + ', ' + featureFound.baselineSupportLevel + '</h4>';
                html += '<div class="description">' + featureFound.description + '</div>';
                html += '<div class="browsers"><table>';
                html += '<tr><th colspan="4">Desktop Browsers</th></tr>';
                html += '<tr>' + browsers.map(browser => `<td>${renderIcon(browser, 24)} ${featureFound.browsers[browser]}</td>`).join('') + '</tr>';
                html += '<tr><th colspan="3">Mobile Browsers</th></tr>';
                html += '<tr>' + mobileBrowsers.map(browser => `<td>${renderIcon(browser, 24)} ${featureFound.browsers[browser]}</td>`).join('') + '</tr>';
                html += '</table></div>';
                html += '<ul>';
                let i = 0;
                const locationLimit = 5;
                for (let location of featureFound.locations) {
                    html += '<li>' + location.filePath + '</li>';
                    i += 1;
                    if (i === locationLimit) {
                        break;
                    }
                }
                if (i === locationLimit && featureFound.locations.length > locationLimit) {
                    html += '<li>...' + (featureFound.locations.length - locationLimit) + ' more results</li>';
                }
                html += '</ul>';
                html += '</div>';
                result.innerHTML += html;
            }
        }
    });

    document.getElementById('scan').addEventListener('click', () => {
        console.log("webview scan button clicked");
        vscode.postMessage({ command: window.EventMessageCommand.START_SCAN });
    });

    document.getElementById('create-jira').addEventListener('click', () => {
        console.log("create JIRA ticket clicked");
        vscode.postMessage({ command: window.EventMessageCommand.CREATE_JIRA });
    });
}());
