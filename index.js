"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var process = require("process");
var core = require("@actions/core");
var child_process_1 = require("child_process");
var __TEST_OBJECT = null;
var verbose;
var __ENVIRONMENT_VARS = {};
function main(argc, argv) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (argv.includes("--test")) {
                        setupTest(argc, argv);
                    }
                    verbose = !!getInput("verbose");
                    return [4 /*yield*/, prepareEnvironmentVars()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, buildAndPushDockerImage()];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function prepareEnvironmentVars() {
    return __awaiter(this, void 0, void 0, function () {
        var environment, parsed_1, verbose, environmentVarsRaw, environmentCasing, environmentVarsReadPrefixRaw, environmentVarsWritePrefixRaw, environmentVarsReadPrefix, environmentVarsWritePrefix, environmentVars, environmentVarsOutputs;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            environment = getInput("environment");
            if (!environment)
                return [2 /*return*/];
            if (process.env.REPO_VARS) {
                parsed_1 = JSON.parse(process.env.REPO_VARS);
                Object.keys(parsed_1).forEach(function (k) {
                    process.env[k] = parsed_1[k];
                });
            }
            verbose = getInput("verbose");
            environmentVarsRaw = getInput("environment-vars", "array");
            environmentCasing = ((_a = getInput("environment-casing")) !== null && _a !== void 0 ? _a : "").toUpperCase();
            environmentVarsReadPrefixRaw = (_b = getInput("environment-vars-read-prefix")) !== null && _b !== void 0 ? _b : "";
            environmentVarsWritePrefixRaw = (_c = getInput("environment-vars-write-prefix")) !== null && _c !== void 0 ? _c : "";
            environmentVarsReadPrefix = executeInstruction(expandVariables(environmentVarsReadPrefixRaw), environmentCasing);
            environmentVarsWritePrefix = executeInstruction(expandVariables(environmentVarsWritePrefixRaw), environmentCasing);
            environmentVars = environmentVarsRaw.reduce(function (acc, key) {
                var _a;
                var instruction = "";
                if (key.includes("|")) {
                    var _b = key.split("|"), _key = _b[0], _instruction = _b[1];
                    key = _key;
                    instruction = _instruction;
                }
                key = expandVariables(key);
                acc[key] = executeInstruction((_a = process.env[environmentVarsReadPrefix + key]) !== null && _a !== void 0 ? _a : "", instruction);
                return acc;
            }, {});
            if (verbose !== undefined) {
                environmentVarsOutputs = Object.keys(environmentVars).reduce(function (acc, k) {
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
            Object.keys(environmentVars).forEach(function (key) {
                core.setOutput(environmentVarsWritePrefix + key, environmentVars[key]);
                __ENVIRONMENT_VARS[environmentVarsWritePrefix + key] = environmentVars[key];
            });
            core.setOutput("env-setup-completed", true);
            return [2 /*return*/];
        });
    });
}
function buildAndPushDockerImage() {
    return __awaiter(this, void 0, void 0, function () {
        var dockerize, dockerfile, dockerShellProcess;
        return __generator(this, function (_a) {
            dockerize = getInput("dockerize", "boolean");
            if (!dockerize)
                return [2 /*return*/];
            dockerfile = getInput("dockerfile", "string", "Dockerfile");
            dockerShellProcess = (0, child_process_1.spawn)('sh');
            dockerShellProcess.stdout.on('data', function (data) {
                print("log", "".concat(data));
            });
            dockerShellProcess.stderr.on('data', function (data) {
                print("error", "".concat(data));
            });
            dockerShellProcess.on('close', function (code) {
                if (code === 0)
                    return;
                print("log", "Docker:Shell:: closed with code - ".concat(code));
            });
            if (verbose) {
                dockerShellProcess.stdin.write("echo \"Preparing to build the image...\";");
                dockerShellProcess.stdin.write("docker buildx build --platform=linux/amd64 -t ".concat(process.env.APP_NAME, " ."));
                //dockerShellProcess.stdin.write(`echo '${process.env.REGISTRY_PASSWORD}' | docker login -u ${process.env.REGISTRY_USERNAME} --password-stdin ${process.env.REGISTRY_HOST};`);
            }
            dockerShellProcess.stdin.end();
            return [2 /*return*/];
        });
    });
}
function executeInstruction(value, instruction) {
    if (instruction === "UPPER")
        return value.toUpperCase();
    else if (instruction === "LOWER")
        return value.toLowerCase();
    else if (instruction === "base64")
        return Buffer.from(value, "utf8").toString("base64");
    else if (instruction === "sanitize")
        return Buffer.from(value.replace("\n", "<=-=>").replace("\r", ""), "utf8").toString("base64").replace("\n", "<=-=>");
    return value;
}
function expandVariables(value) {
    var result = "";
    var activeVar = "";
    for (var _i = 0, value_1 = value; _i < value_1.length; _i++) {
        var c = value_1[_i];
        if (c == "$" && activeVar == "") {
            activeVar += c;
            continue;
        }
        else if (activeVar != "") {
            if (c == "}") {
                result += getInput(activeVar.substring(2));
                activeVar = "";
            }
            else {
                activeVar += c;
            }
            continue;
        }
        result += c;
    }
    return result;
}
function getInput(name, type, defaultValue) {
    if (type === void 0) { type = "string"; }
    var value = (__TEST_OBJECT ? __TEST_OBJECT[name] : core.getInput(name));
    if (!value || value == "") {
        return defaultValue;
    }
    if (type === "boolean") {
        return value.toUpperCase() === "TRUE" || value;
    }
    else if (type === "flatten_string") {
        return value.split('\n').join(' ');
    }
    else if (type === "array" && (typeof value == "string")) {
        return value.split(__TEST_OBJECT ? "\\n" : '\n');
    }
    return value;
}
function print(action) {
    if (action === void 0) { action = "log"; }
    var content = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        content[_i - 1] = arguments[_i];
    }
    if (verbose === undefined) {
        verbose = !!getInput("verbose");
    }
    if (!verbose)
        return;
    console[action].apply(console, content);
}
function setupTest(argc, argv) {
    __TEST_OBJECT = {};
    for (var _i = 0, argv_1 = argv; _i < argv_1.length; _i++) {
        var arg = argv_1[_i];
        if (arg.startsWith("-")) {
            var argParts = arg.split("=");
            __TEST_OBJECT[argParts[0].substring(1)] = argParts[1];
        }
    }
}
main(process.argv.length - 2, process.argv.slice(2));
