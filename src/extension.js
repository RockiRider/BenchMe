const vscode = require('vscode');
const findMethod = require('./comp/fileController/findMethod');
const sidebarProvider = require('./comp/SideBarProvider');
const basicMethodStorage = require('./comp/storage/storeBasicMethods');
const dynamicMethodStorage = require('./comp/storage/storeDynamicMethods');

/** 
* Legacy
* const mainDisplay = require('./comp/MainPanel');
* const closeViewTracker = require('./comp/closeCounter');
*/





const open = require('open');
const {instance} = require('./comp/objController/serverInstance');
let browserOpened = true;


/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	
	const sbProvider = new sidebarProvider.SidebarProvider(context.extensionUri);
	context.subscriptions.push(vscode.window.registerWebviewViewProvider("bench-it-sidebar", sbProvider));
	instance.createServer();

	function findFunction(name, path) {
		return new Promise(function (resolve, reject) {
			const found = findMethod.getMethodData(name, path);
			if (found) {
				if (found.head == 'Error') {
					//TODO: Better Error Handling
					reject(found.msg);
				} else {
					resolve(found)
				}
			} else {
				reject(("Internal Error"));
			}
		});
	}


	/**
	 * Tracks changes to the current document, in order to capture any changes made to existing tracked Basic/Dynamic Functions
	 */
	vscode.workspace.onDidChangeTextDocument(changeEvent => {
		let currentDoc = vscode.window.activeTextEditor.document;
		let currentAct = vscode.window.activeTextEditor;
		// let activePath = currentDoc.uri.fsPath;
		if (currentDoc.uri === changeEvent.document.uri && (basicMethodStorage.storeEmpty() || dynamicMethodStorage.storeEmpty())) {

			let line = vscode.window.activeTextEditor.selection.active.line;
			// let char = vscode.window.activeTextEditor.selection.active.character;
			let changingDoc = changeEvent.document.uri.fsPath;
			

			let basicArr = basicMethodStorage.getStore();
			let dynamicArr = dynamicMethodStorage.getStore();
			
			const foundBasicItem = basicArr.find((item) => {
				if(item.fsPath === changingDoc && item.start <= line && line <= item.finish){
					return item;
				}else if(item.fsPath === changingDoc && item.examples.exampleData.numOfParams > 0){
					if(item.examples.start <= line && line <= item.examples.end){
						return item;
					}
				}
			})
			const foundDynItem = dynamicArr.find((item) => {
				if(item.fsPath === changingDoc && item.start <= line && line <= item.finish){
					return item;
				}else if(item.fsPath === changingDoc && item.examples.start <= line && line <= item.examples.end){
					return item;
				}
			})

			if(foundBasicItem){
				console.log(`${foundBasicItem.name} basic changed!`);
				findFunction(foundBasicItem.name,currentAct).then((data) => {
					let methodInfo = new basicMethodStorage.BasicMethodObj(foundBasicItem.name, foundBasicItem.id, data.start, data.finish, data.filePath, data.text,data.type,data.examples);
					basicMethodStorage.findAndReplace(methodInfo);
					instance.handleMsg({type: 'load-basic-save',data: basicMethodStorage.getStore()});
				}).catch((error)=>{
					basicMethodStorage.findAndRemove(foundBasicItem.name,foundBasicItem.id);
					console.log(error);
				})
			}else if(foundDynItem){
				console.log(`${foundDynItem.name} dynamic changed!`);
				findFunction(foundDynItem.name,currentAct).then((data) => {
					let methodInfo = new dynamicMethodStorage.DynamicMethodObj(foundDynItem.name, foundDynItem.id, data.start, data.finish, data.filePath, data.text,data.type,data.examples);
					dynamicMethodStorage.findAndReplace(methodInfo);
					instance.handleMsg({type: 'load-dynamic-save',data: dynamicMethodStorage.getStore()});
				}).catch((error)=>{
					dynamicMethodStorage.findAndRemove(foundDynItem.name,foundDynItem.id);
					console.log(error);
				})
			}

		}
		/* TODO:
		Live Programming Could be made more efficient like so
		for (const change of changeEvent.contentChanges) {
			 console.log(change.range); // range of text being replaced
			 console.log(change.text); // text replacement
		}
		*/
	});

	console.log('Congratulations, your extension "benchIt" is now active!');

	let basicCounter = 1;
	let dynamicCounter = 1;

	/**
	 * AddCase Command Execution Flow
	 */
	context.subscriptions.push(vscode.commands.registerCommand('benchit.addCase', function () {

		let inputBox = new Promise((resolve, reject) => {
			const result = vscode.window.showInputBox({
				ignoreFocusOut: true,
				password: false,
				placeHolder: 'Input Function Name On Active Text-Editor',
			});

			if (result) {
				resolve(result);
			} else {
				reject("No Input!");
				console.log("ERR!");
			}
		})

		let activeEd = new Promise((resolve, reject) => {
			let currentActive = vscode.window.activeTextEditor;

			if (!currentActive) {
				reject("No Active Editor");
			} else {
				resolve(currentActive);
			}
		})



		// AddCase Command Process starts here
		inputBox.then((method) => {

			//Check for active editor first and then reject if need be
			activeEd.then((foundEditor) => {

				//Wait for SideBar to activate so the new Function is registered here too!
				vscode.commands.executeCommand('workbench.view.extension.bench-it-sidebar-view');
				setTimeout(function(){ 
					 
					findFunction(method, foundEditor).then((data) => {
						//Function is found from here! Start the server!
						
						let methodInfo;

						if(data.type == 'Basic'){
							//Sends to storage to save
							methodInfo = new basicMethodStorage.BasicMethodObj(method, basicCounter, data.start, data.finish, data.filePath, data.text,data.type,data.examples);
							basicMethodStorage.pushToStore(methodInfo);
							


							sbProvider._view.webview.postMessage({
								type: "new-function",
								value: {
									name: method,
									id: basicCounter,
									type: data.type
								},
							})

							//mainDisplay.MainPanel.currentPanel._panel.webview.postMessage({});

							basicCounter++;
						}else{
							//Sends to storage to save
							methodInfo = new dynamicMethodStorage.DynamicMethodObj(method, dynamicCounter, data.start, data.finish, data.filePath, data.text,data.type,data.examples);
							dynamicMethodStorage.pushToStore(methodInfo);
							
							//Sending to Sidebar
							sbProvider._view.webview.postMessage({
								type: "new-function",
								value: {
									name: method,
									id: dynamicCounter,
									type: data.type
								},
							})
							dynamicCounter++;
						}
						console.log(methodInfo);
						
						//TODO: Don't really need this block anymore due to storage
						if(browserOpened){
							instance.handleMsg({type: 'new-function',data: methodInfo});
						}else{
							open('http://localhost:52999').then(() =>{
								//Send to new function to server
								instance.handleMsg({type: 'new-function',data: methodInfo});
								browserOpened = true;
							}).catch((error)=>{
								console.log(error);
								console.log("Could not open Browser!");
								vscode.window.showWarningMessage('Error! Could not open Browser!');
							});
						}
					}).catch((errorMsg) => {
						//Function not found!
						vscode.window.showWarningMessage(errorMsg + ". Try again");
						console.log("ERROR ON " + errorMsg);
					})
				}, 100);

			}).catch((errorMsg) => {
				//Active Editor Not found
				vscode.window.showWarningMessage('Warning! No Active Editor');
				console.log("ERROR ON " + errorMsg);
			})
		}).catch((method) => {
			vscode.window.showWarningMessage('Warning! Input not recieved');
			console.log("ERROR ON " + method);

		})


	}));
}
// @ts-ignore
exports.activate = activate;



/**
 * This method is called when your extension is deactivated
 * TODO: Clean Up is required!
 */
function deactivate() {}




module.exports = {
	// @ts-ignore
	activate,
	deactivate
}