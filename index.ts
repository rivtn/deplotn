
import * as fs from "fs";
import * as process from "process";
import * as core from "@actions/core";
import { spawn } from "child_process";
import * as github from "@actions/github";

let __TEST_OBJECT: any = null;
let verbose: undefined | boolean;
let __ENVIRONMENT_VARS: { [key: string]: string; } = {};

async function main(argc: number, argv: string[]) {
    if (argv.includes("--test")) {
        setupTest(argc, argv);
    }
    verbose = !!getInput("verbose");
    if (process.env.REPO_VARS) {
        let parsed = JSON.parse(process.env.REPO_VARS);
        Object.keys(parsed).forEach((k) => {
            process.env[k] = parsed[k];
        })
    }
    await prepareEnvironmentVars();
    await buildAndPushDockerImage();
    //await executeSshCommands();
}

async function prepareEnvironmentVars() {
    const environmentOutput = getInput("environment-output", "boolean");
    if (!environmentOutput) return;
    const verbose = getInput("verbose");
    const environment = getInput("environment", "string", "main");
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
        acc[key] = executeInstruction(process.env[environmentVarsReadPrefix + key] ?? "", instruction)?.replaceAll("\r", "");
        return acc;
    }, {});
    if (verbose !== undefined) {
        const environmentVarsOutputs = Object.keys(environmentVars).reduce((acc: any, k) => {
            acc[environmentVarsWritePrefix + k] = environmentVars[k];
            return acc;
        }, {});
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
        __ENVIRONMENT_VARS[environmentVarsWritePrefix + key] = environmentVars[key];
    });
    core.setOutput("env-setup-completed", true);
}

async function buildAndPushDockerImage() {
    if (!getInput("dockerize", "boolean")) return;
    const environment = getInput("environment", "string", "main");
    const dockerfile = getInput("dockerfile", "string", "Dockerfile");
    const appName = getInput("app-name", "string", process.env.APP_NAME ?? "");
    const dockerProjectEnvPath = getInput("docker-project-env-path", "string", "");
    const environmentCasing = (getInput("environment-casing") ?? "").toUpperCase();
    const environmentVarsRaw = getInput("docker-write-env-vars", "array") as string[];
    const environmentVarsReadPrefixRaw = getInput("environment-vars-read-prefix") ?? "";
    const dockerRegistryHost = getInput("docker-registry-host", "string", process.env.REGISTRY_HOST ?? "");
    const dockerRegistryUsername = getInput("docker-registry-username", "string", process.env.REGISTRY_USERNAME ?? "");
    const dockerRegistryPassword = getInput("docker-registry-password", "string", process.env.REGISTRY_PASSWORD ?? "");
    const environmentVarsReadPrefix = executeInstruction(expandVariables(environmentVarsReadPrefixRaw), environmentCasing);
    const environmentVars = environmentVarsRaw.reduce((acc: any, key: string) => {
        let instruction = "";
        if (key.includes("|")) {
            const [_key, _instruction] = key.split("|");
            key = _key;
            instruction = _instruction;
        }
        key = expandVariables(key);
        if (key in __ENVIRONMENT_VARS) {
            acc[key] = executeInstruction(__ENVIRONMENT_VARS[key], instruction)?.replaceAll("\r", "");
        } else {
            acc[key] = process.env[environmentVarsReadPrefix + key]?.replaceAll("\r", "");
        }
        return acc;
    }, {});

    print("log", ".env Environment variables", environmentVars);

    if (Object.keys(environmentVars).length && dockerProjectEnvPath) {
        Object.keys(environmentVars).forEach((k) => {
            fs.writeFileSync(dockerProjectEnvPath, environmentVars[k]);
        });
    }
    print("log", `Preparing to build the image...`);
    const dockerShellProcess = spawn('sh');
    dockerShellProcess.stdout.on('data', (data) => {
        print("log!", `${data}`);
    });
    dockerShellProcess.stderr.on('data', (data) => {
        print("error", `${data}`);
    });
    dockerShellProcess.on('close', (code) => {
        if (code === 0) return;
        print("log", `Docker:Shell:: closed with code - ${code}`);
        core.setFailed(`${code}`);
    });
    dockerShellProcess.stdin.write(`echo '${dockerRegistryPassword}' | docker login -u ${dockerRegistryUsername} --password-stdin ${dockerRegistryHost};`);
    dockerShellProcess.stdin.write(`docker buildx build -f ${dockerfile} --platform=linux/amd64 -t ${appName} .;`);
    dockerShellProcess.stdin.write(`docker tag ${appName} ${dockerRegistryHost}/${environment}/${appName};`);
    dockerShellProcess.stdin.write(`docker push ${dockerRegistryHost}/${environment}/${appName};`);
    dockerShellProcess.stdin.end();
}

async function executeSshCommands() {
    print("log", `Connecting to SSH server...`);
    const environmentCasing = (getInput("environment-casing") ?? "").toUpperCase();
    const environmentVarsReadPrefixRaw = getInput("environment-vars-read-prefix") ?? "";
    const environmentVarsReadPrefix = executeInstruction(expandVariables(environmentVarsReadPrefixRaw), environmentCasing);
    const environmentVars = ["SSH_HOST", "SSH_PORT", "SSH_USERNAME", "SSH_PASSWORD"].reduce((acc: any, key: string) => {
        let instruction = "";
        if (key.includes("|")) {
            const [_key, _instruction] = key.split("|");
            key = _key;
            instruction = _instruction;
        }
        key = expandVariables(key);
        if (key in __ENVIRONMENT_VARS) {
            acc[key] = executeInstruction(__ENVIRONMENT_VARS[key], instruction);
        } else {
            acc[key] = process.env[environmentVarsReadPrefix + key];
        }
        return acc;
    }, {});
    print("log", "SSH Variables", environmentVars);
    const sshHost = getInput("ssh-host", "string", environmentVars["SSH_HOST"] ?? process.env.SSH_HOST ?? "");
    const sshPort = getInput("ssh-port", "string", environmentVars["SSH_PORT"] ?? process.env.SSH_PORT ?? "");
    const sshUsername = getInput("ssh-username", "string", environmentVars["SSH_USERNAME"] ?? process.env.SSH_USERNAME ?? "");
    const sshPassword = getInput("ssh-password", "string", environmentVars["SSH_PASSWORD"] ?? process.env.SSH_PASSWORD ?? "");

    const sshProcess = spawn('ssh', ["-o", "StrictHostKeyChecking=no", "-p", sshPort, `${sshUsername}@${sshHost}`]);
    sshProcess.stdout.on('data', (data) => {
        print("log", `${data}`);
        if (`${data}`.includes("key fingerprint")) {
            sshProcess.stdin.write(`yes\n`);
        } else if (`${data}`.includes("Permission denied") || (`${data}`.includes("password:") && `${data}`.includes("@" + sshHost))) {
            print("log", "here we go -- welp ", sshPassword);
            sshProcess.stdin.write(`${sshPassword}\n`);
            return;
        }
    });
    sshProcess.stderr.on('data', (data) => {
        print("error", `${data}`);
        if (`${data}`.includes("Permission denied") || (`${data}`.includes("password:") && `${data}`.includes("@" + sshHost))) {
            print("log", "here we go ", sshPassword);
            sshProcess.stdin.write(`${sshPassword}`);
            sshProcess.stdin.end();
        }
    });
    sshProcess.on('close', (code) => {
        if (code === 0) return;
        print("log", `SSH:Shell:: closed with code - ${code}`);
        core.setFailed(`${code}`);
    });
    //sshProcess.stdin.write(`dokku apps:list;`);
    if (getInput("dokku-deploy", "boolean")) {
        //sshProcess.stdin.write(`dokku apps:list;`);
    }
    //sshProcess.stdin.end();
}

function executeInstruction(value: string, instruction: string) {
    if (instruction === "UPPER") return value.toUpperCase();
    else if (instruction === "LOWER") return value.toLowerCase();
    else if (instruction === "base64") return Buffer.from(value, "utf8").toString("base64");
    else if (instruction === "sanitize") return Buffer.from(value.replace("\n", "<=-=>").replaceAll("\r", ""), "utf8").toString("base64").replaceAll("\n", "<=-=>");
    else if (instruction === "desanitize") return Buffer.from(value.replaceAll("<=-=>", "\n"), "base64").toString("utf8").replaceAll("<=-=>", "\n");
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

function print(action: "log" | "log!" | "error" = "log", ...content: string[]) {
    if (verbose === undefined) {
        verbose = !!getInput("verbose");
    }
    if (!verbose) return;
    if (action === "log!") {
        process.stdout.write(content.join(" "));
        return;
    }
    console[action](...content);
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