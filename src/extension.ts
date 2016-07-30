"use strict";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import {Analyzer} from "./analyzer";

const configExtensionName = "dart";
const configSdkPathName = "sdkPath";
const dartVMPath = "bin/dart.exe";
const analyzerPath = "bin/snapshots/analysis_server.dart.snapshot";
const analyzerOutputWindow = "Dart Analysis Server"; // TODO: This should be debug-only?

let dartSdkRoot: string;
let analyzer: Analyzer;

export function activate(context: vscode.ExtensionContext) {
    console.log("Dart-Code activated!");

    dartSdkRoot = findDartSdk();
    if (dartSdkRoot == null) {
        vscode.window.showErrorMessage("Dart-Code: Could not find a Dart SDK to use. Please add it to your PATH or set it in the extensions settings and reload");
        return; // Don't set anything else up; we can't work like this!
    }

    analyzer = new Analyzer(path.join(dartSdkRoot, dartVMPath), path.join(dartSdkRoot, analyzerPath));
}

export function deactivate() {
    analyzer.stop();
    
    console.log("Dart-Code deactivated!");
}

function findDartSdk(): string {
    let config = vscode.workspace.getConfiguration(configExtensionName);
    let paths = (<string>process.env.PATH).split(";");

    // We don't expect the user to add .\bin in config, but it would be in the PATHs
    if (config.has(configSdkPathName))
        paths.unshift(path.join(config.get<string>(configSdkPathName), 'bin'));

    let sdkPath = paths.find(isValidDartSdk);
    if (sdkPath)
        return path.join(sdkPath, ".."); // Take .\bin back off.

    return null;
}

function isValidDartSdk(pathToTest: string): boolean {
    // Apparently this is the "correct" way to check files exist synchronously in Node :'(
    try {
        fs.accessSync(path.join(pathToTest, "..", analyzerPath), fs.R_OK);
        return true; // If no error, we found a match!
    }
    catch (e) { }

    return false; // Didn't find it, so must be an invalid path.
}