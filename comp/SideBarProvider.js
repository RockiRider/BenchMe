const vscode = require('vscode');
const getNonce = require('./getNonce');

class SidebarProvider {
  constructor(_extensionUri) {
    this._extensionUri = _extensionUri;
  }
  resolveWebviewView(webviewView) {
    this._view = webviewView;
    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "onInfo": {
          if (!data.value) {
            return;
          }
          vscode.window.showInformationMessage(data.value);
          break;
        }
        case "onError": {
          if (!data.value) {
            return;
          }
          vscode.window.showErrorMessage(data.value);
          break;
        }
      }
    });
  }
  revive(panel) {
    this._view = panel;
  }
  _getHtmlForWebview(webview) {
    const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "assets", "reset.css"));
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "assets", "sidebar/main.js"));
    const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "assets", "compiled/sidebar.css"));
    const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "assets", "vscode.css"));
    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce.getNonce();
    return `<!DOCTYPE html>
            <html lang="en">
              <head>
                  <meta charset="UTF-8">
                  <!--
                      Use a content security policy to only allow loading images from https or from our extension directory,
                      and only allow scripts that have a specific nonce.
                  -->
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <link href="${styleResetUri}" rel="stylesheet">
                  <link href="${styleVSCodeUri}" rel="stylesheet">
                  <link href="${styleMainUri}" rel="stylesheet">
              </head>
              <body>
                <button id="button">Button Here</button>

                <!-- Scripts below -->
                <script src="https://code.jquery.com/jquery-3.2.1.slim.min.js"
			            integrity="sha384-KJ3o2DKtIkvYIK3UENzmM7KCkRr/rE9/Qpg6aAZGJwFDMVNA/GpGFF93hXpG5KkN" crossorigin="anonymous">
		            </script>
                <script nonce="${nonce}" src="${scriptUri}"></script>
              </body>
            </html>`;
  }
}
// @ts-ignore
//exports.getNonce = getNonce;

module.exports = {
  // @ts-ignore
  SidebarProvider
}