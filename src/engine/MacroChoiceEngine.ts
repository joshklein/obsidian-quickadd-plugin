import {QuickAddEngine} from "./QuickAddEngine";
import type IMacroChoice from "../types/choices/IMacroChoice";
import type {App, TAbstractFile} from "obsidian";
import {TFile} from "obsidian";
import type {IUserScript} from "../types/macros/IUserScript";
import type {IObsidianCommand} from "../types/macros/IObsidianCommand";
import {log} from "../logger/logManager";
import {CommandType} from "../types/macros/CommandType";
import type QuickAdd from "../main";
import {QuickAddApi} from "../quickAddApi";

export class MacroChoiceEngine extends QuickAddEngine {
    choice: IMacroChoice;

    constructor(app: App, choice: IMacroChoice, private quickAdd: QuickAdd) {
        super(app);
        this.choice = choice;
    }

    async run(): Promise<void> {
        for (const command of this.choice.macro.commands) {
            if (command.type === CommandType.Obsidian)
                await this.executeObsidianCommand(command as IObsidianCommand);
            if (command.type === CommandType.UserScript)
                await this.executeUserScript(command as IUserScript);
        }
    }

    // Slightly modified from Templater's user script engine:
    // https://github.com/SilentVoid13/Templater/blob/master/src/UserTemplates/UserTemplateParser.ts
    private async executeUserScript(command: IUserScript) {
        // @ts-ignore
        const vaultPath = this.app.vault.adapter.getBasePath();
        const file: TAbstractFile = this.app.vault.getAbstractFileByPath(command.path);
        if (!file) {
            log.logError(`failed to load file ${command.path}.`);
            return;
        }

        if (file instanceof TFile) {
            const filePath = `${vaultPath}/${file.path}`;

            if (window.require.cache[window.require.resolve(filePath)]) {
                delete window.require.cache[window.require.resolve(filePath)];
            }

            // @ts-ignore
            const userScript = await import(filePath);
            if (!userScript.default || !(userScript.default instanceof Function)) {
                log.logError(`failed to load user script ${filePath}.`);
                return;
            }

            await userScript.default({app: this.app, quickAddApi: QuickAddApi.GetApi(this.app)});
        }
    }

    private executeObsidianCommand(command: IObsidianCommand) {
        // @ts-ignore
        this.app.commands.executeCommandById(command.id);
    }
}