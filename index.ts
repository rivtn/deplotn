
import * as process from "process";
import * as core from "@actions/core";
import * as github from "@actions/github";

let __TEST_OBJECT: any = null;

async function main(argc: number, argv: string[]) {
    if (argv.includes("--test")) {
        setupTest(argc, argv);
    }
    prepareEnvironmentVars();
}

async function prepareEnvironmentVars() {
    const environment = getInput("environment");
    if (!environment) return;
    const verbose = getInput("verbose");
    const environmentVarsRaw = getInput("environment-vars", "array") as string[];
    const environmentCasing = (getInput("environment-casing") ?? "").toUpperCase();
    const environmentVarsReadPrefixRaw = getInput("environment-vars-read-prefix") ?? "";
    const environmentVarsWritePrefixRaw = getInput("environment-vars-write-prefix") ?? "";
    const environmentVarsReadPrefix = executeInstruction(expandVariables(environmentVarsReadPrefixRaw), environmentCasing);
    const environmentVarsWritePrefix = executeInstruction(expandVariables(environmentVarsWritePrefixRaw), environmentCasing);
    const environmentVars = environmentVarsRaw.reduce((acc: any, key: string) => {
        let instruction = "";
        if (key.includes("|")) {
            const [_key, _instruction] = key.split("|");
            key = _key;
            instruction = _instruction;
        }
        key = expandVariables(key);
        acc[key] = executeInstruction(process.env[environmentVarsReadPrefix + key] ?? "", instruction);
        return acc;
    }, {});
    if (verbose !== undefined) {
        const environmentVarsOutputs = Object.keys(environmentVars).reduce((acc: any, k) => {
            acc[environmentVarsWritePrefix + k] = environmentVars[k];
            return acc;
        }, {});
        console.log("PROC=", process.env);
        console.log("ENV=", environment);
        console.log("ENV-CASING=", environmentCasing);
        console.log("ENV-VARS-READ-PREFIX - (PRE)=", environmentVarsReadPrefixRaw);
        console.log("ENV-VARS-READ-PREFIX - (POST)=", environmentVarsReadPrefix);
        console.log("ENV-VARS-WRITE-PREFIX - (PRE)=", environmentVarsWritePrefixRaw);
        console.log("ENV-VARS-WRITE-PREFIX - (POST)=", environmentVarsWritePrefix);
        console.log("ENV-VARS= (PRE)", environmentVarsRaw);
        console.log("ENV-VARS= (POST)", environmentVars);
        console.log("ENV-VARS-OUTPUT=", environmentVarsOutputs);
    }
    Object.keys(environmentVars).forEach((key) => {
        core.setOutput(environmentVarsWritePrefix + key, environmentVars[key]);
    });
}

function executeInstruction(value: string, instruction: string) {
    if (instruction === "UPPER") return value.toUpperCase();
    else if (instruction === "LOWER") return value.toLowerCase();
    else if (instruction === "base64") return Buffer.from(value, "utf8").toString("base64");
    else if (instruction === "sanitize") return Buffer.from(value.replace("\n", "<=-=>").replace("\r", ""), "utf8").toString("base64").replace("\n", "<=-=>");
    return value;
}

function expandVariables(value: string) {
    let result = "";
    let activeVar = "";
    for (const c of value) {
        if (c == "$" && activeVar == "") {
            activeVar += c;
            continue;
        } else if (activeVar != "") {
            if (c == "}") {
                result += getInput(activeVar.substring(2));
                activeVar = "";
            } else {
                activeVar += c;
            }
            continue;
        }
        result += c;
    }
    return result;
}

function getInput(name: string, type: string = "string", defaultValue?: any) {
    const value = (__TEST_OBJECT ? __TEST_OBJECT[name] : core.getInput(name));
    if (!value || value == "") {
        return defaultValue;
    }
    if (type === "boolean") {
        return value.toUpperCase() === "TRUE" || value;
    } else if (type === "flatten_string") {
        return value.split('\n').join(' ');
    } else if (type === "array" && (typeof value == "string")) {
        return value.split(__TEST_OBJECT ? "\\n" : '\n');
    }
    return value;
}

function setupTest(argc: number, argv: string[]) {
    __TEST_OBJECT = {};
    for (const arg of argv) {
        if (arg.startsWith("-")) {
            const argParts = arg.split("=");
            __TEST_OBJECT[argParts[0].substring(1)] = argParts[1];
        }
    }
}

main(process.argv.length - 2, process.argv.slice(2));