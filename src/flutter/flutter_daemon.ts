"use strict";

import { config } from "../config";
import { FlutterDeviceManager } from "./device_manager";
import { log, logError, extensionVersion } from "../utils";
import { StdIOService, Request, UnknownResponse, UnknownNotification } from "../services/stdio_service";
import * as child_process from "child_process";
import * as f from "./flutter_types";
import * as fs from "fs";
import * as vs from "vscode";
import { flutter_env } from "../debug/utils";

export class FlutterDaemon extends StdIOService {
	deviceManager: FlutterDeviceManager;

	constructor(flutterBinPath: string, projectFolder: string) {
		super(config.flutterDaemonLogFile, true);

		this.createProcess(projectFolder, flutterBinPath, ["daemon"], flutter_env);

		this.deviceManager = new FlutterDeviceManager(this);

		// Enable device polling.
		this.deviceEnable();
	}

	dispose() {
		this.deviceManager.dispose();
		super.dispose();
	}

	protected sendMessage<T>(json: string) {
		try {
			super.sendMessage(json);
		}
		catch (e) {
			const reloadAction: string = "Reload Project";
			vs.window.showErrorMessage(`The Flutter Daemon has terminated. Save your changes then reload the project to resume.`, reloadAction).then(res => {
				if (res == reloadAction)
					vs.commands.executeCommand("workbench.action.reloadWindow");
			});
			throw e;
		}
	}

	protected shouldHandleMessage(message: string): boolean {
		// Everything in flutter is wrapped in [] so we can tell what to handle.
		return message.startsWith('[') && message.endsWith(']');
	}

	// TODO: Can we code-gen all this like the analysis server?

	protected handleNotification(evt: UnknownNotification) {
		switch (evt.event) {
			case "device.added":
				this.notify(this.deviceAddedSubscriptions, <f.Device>evt.params);
				break;
			case "device.removed":
				this.notify(this.deviceRemovedSubscriptions, <f.Device>evt.params);
				break;
		}
	}

	// Subscription lists.	

	private deviceAddedSubscriptions: ((notification: f.Device) => void)[] = [];
	private deviceRemovedSubscriptions: ((notification: f.Device) => void)[] = [];


	// Request methods.

	deviceEnable(): Thenable<UnknownResponse> {
		return this.sendRequest("device.enable");
	}


	// Subscription methods.

	registerForDeviceAdded(subscriber: (notification: f.Device) => void): vs.Disposable {
		return this.subscribe(this.deviceAddedSubscriptions, subscriber);
	}

	registerForDeviceRemoved(subscriber: (notification: f.Device) => void): vs.Disposable {
		return this.subscribe(this.deviceRemovedSubscriptions, subscriber);
	}
}
