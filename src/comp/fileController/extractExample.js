/**
 * extractExample.js essentially parses the inputted example data.
 */

/**
 * Checks the declared Type of the function
 * @param {String} str 
 * @returns the type of function: Basic | Dynamic
 */
function type(str){
    if(str.includes("@type == Basic")){
        return "Basic";
    }else if(str.includes("@type == Dynamic")){
        return "Dynamic";
    }else{
        console.log("Type Error!");
        return "Error";
    }
}

/**
 * Finds data type of the declared parameters
 * @param {String} str 
 * @returns an object with the data type and name
 */
function params(str){
    let output = {type:null,name:null};

    let temp = str.split("} ");
    output.name = temp[1].replace(/[\n\r]/g,"").trim();

    if(str.includes("@param {Array}")){
        output.type = 'Array';
    }else if(str.includes("@param {String}")){
        output.type = 'String';
    }else if(str.includes("@param {Number}")){
        output.type = 'Number';
    }else if(str.includes("@param {Object}")){
        output.type = 'Object';
    }else{
        console.log("Params Error!");
        return "Error";
    }
    return output;
}
/**
 * Parses the declared example variable
 * @param {String} str 
 * @returns an Object with the name and value of the variable
 */
function example(str){
    let output = {name:null,value:null};

    try {

        let variable = str.split('@example');
        let varName = variable[1].split('==');
        output.name = varName[0].replace(/[\n\r]/g,"").trim();
        output.value = varName[1].replace(/[\n\r]/g,"").trim();

        if(output.value.includes("RandomInt")){
            let data = output.value.split("RandomInt ");
            // output.value = randomGen(data[1]);

            let txt = data[1];
            let numb = txt.match(/\d/g);
            numb = numb.join("");
            output.value = randomGen(numb);
        }

    } catch (error) {
       return "Error";
    }


    return output;
}

/**
 * Generates an array of inputted size with random Numbers
 * @param {Number} size 
 * @returns an Array of random integers
 */
function randomGen(size){
    let temp = [];
    for(let i = 0;i<size;i++){
        let ran = Math.floor(Math.random() * 10000);
        temp.push(ran);
    }
    return temp;
}

module.exports = {
	// @ts-ignore
	type,params,example
}