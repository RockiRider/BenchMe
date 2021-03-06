//TODO: ES6 + ES5
const extraction = require('./extractExample');

/**
 * Example Based Object
 * @param {String} inType 
 * @param {Array | Null} inParams 
 * @param {Number} inNumOfParams 
 */
function MethodType(inType,inParams,inNumOfParams){
	this.type = inType;
	this.paramData = inParams;
	this.numOfParams = inNumOfParams;
}


/**
 * Searches for Example Based Inputs 
 * @param {Array} allLines 
 * @param {String} name 
 * @param {*} knownParams 
 * @returns Object describing the location of the Example
 */
function findComments(allLines,name,knownParams){

	let foundComments = {
		head: null,
		start:-1,
		exampleData: null,
		end:-1,
		errorMsg: ""
	};

	let currentSearch = new MethodType(null,null,knownParams.length);
	let tempParams = [];
	let tempExamples = [];

	for(let index = 0; index < allLines.length; index++){
		let currentLine = allLines[index];
		if(foundComments.start >= 0 && foundComments.end >= 0){
			foundComments.head = "Accepted";

			let collectedExampleData = knownParams.map((el)=>{
				const foundParam = tempParams.find((param) => {
					return param.name == el; 
				});
				const foundExample = tempExamples.find((example) => {
					return example.name == el; 
				});

				let val;

				if(foundParam.type == 'Array'){
					val = foundExample.value;
					if(Array.isArray(val) === false){
						val = JSON.parse(val);
					}
					return {dataType: foundParam.type, name: el, value: [val]};
				}else if(foundParam.type == 'Object'){
					val = JSON.parse(foundExample.value);
				}else if(foundParam.type == 'Number'){
					val = parseFloat(foundExample.value);
				}else{
					val = foundExample.value;
				}
				return {dataType: foundParam.type, name: el, value: val};
			});

			currentSearch.paramData = collectedExampleData;
			foundComments.exampleData = currentSearch;
			//We found the whole section & the data so we exit the loop
			break;
		}
		//Begining of the found Example Based Input
		if(currentLine.includes("/**") && currentLine.includes(name+" Example")){
			foundComments.start = index + 1;
		}

		if(foundComments.end == -1 && foundComments.start >= 0){

			let readData = breakDownData(currentLine);

			switch (readData.header) {
				case "type":{
					currentSearch.type = readData.val;
					break;
				}
				case "param":{
					tempParams.push(readData.val);
					break;
				}
				case "example":{
					tempExamples.push(readData.val);
					break;
				}
				case "error":{
					foundComments.head = "error";
					foundComments.errorMsg = readData.val;
					return foundComments;
				}
				case "ignore":{
					break;
				}
			}

		}
		if(foundComments.start >= 0 && currentLine.includes("*/")){
			foundComments.end = index +1;
		}
	}
	if(foundComments.start >= 0 && foundComments.end >= 0){
		return foundComments;
	}
	return false;
}

function findParams(str){
	let matches = str.match(/\(.*?\)/)[0].replace(/[()]/gi, '').replace(/\s/gi, '').split(',');
	if(matches.length == 0 || matches[0]==''){
		return false;
	}else{
		return matches;
	}
}

/**
 * Breaks Down the Example Based Input and starts categorising the inputs into an Object to store
 * @param {String} str 
 * @returns Data on each possible instance, along with error msgs
 */
function breakDownData(str){

	let data = {header:null,val:null};

	if(str.includes("@type")){
		data.header = "type";
		data.val = extraction.type(str);
		if(data.val == 'Error'){
			data.header = 'error';
			data.val = 'Syntax error with @type';
		}
	}else if(str.includes("@param")){
		data.header = 'param';
		data.val = extraction.params(str);
		if(data.val == 'Error'){
			data.header = 'error';
			data.val = 'Syntax error with @param';
		}
	}else if(str.includes("@example")){
		data.header = 'example';
		data.val = extraction.example(str);
		if(data.val == 'Error'){
			data.header = 'error';
			data.val = 'Syntax error with @example';
		}
	}else{
		//TODO: Returns confirmation??
		data.header = 'ignore';
	}
	return data;
}

// @ts-ignore
//exports.findComments = findComments;

module.exports = {
	// @ts-ignore
	findComments,MethodType,findParams
}