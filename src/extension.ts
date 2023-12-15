import { DebugSession, ExtensionContext, Location, OutputChannel, Range, SourceBreakpoint, commands, debug, window } from 'vscode';
import { DAPClient, DAPRequest } from './dap';

export async function activate(context: ExtensionContext) {
    const output = window.createOutputChannel('JS Custom Breakpoint');
    const breakpointManager = new BreakpointManager(output);

    context.subscriptions.push(
        output,
        commands.registerCommand('vscode-custom-breakpoint.setBreakpointAtCursor', async () => {
            await breakpointManager.setBreakpointAtCursor(BreakpointKind.boundToStackTrace);
        }),
        commands.registerCommand('vscode-custom-breakpoint.setBreakpointAtCursorStrict', async () => {
            await breakpointManager.setBreakpointAtCursor(BreakpointKind.boundToStackTraceStrict);
        }),
    );
}

export function deactivate() { }

enum BreakpointKind {
    /**
     * Breakpoint bound to the order and names of the stack-trace entries.
     */
    boundToStackTrace,
    /**
     * Breakpoint bound to the order, names, and location of the stack-trace entries.
     */
    boundToStackTraceStrict,
}

class BreakpointManager {
    constructor(readonly output: OutputChannel) { }

    async setBreakpointAtCursor(kind: BreakpointKind) {
        const session = debug.activeDebugSession;
        if (!session) {
            window.showErrorMessage("There's no active debug session.");
            return;
        }

        const editor = window.activeTextEditor;
        if (!editor) {
            return;
        }

        const client = this._createDAPClient(session);

        const threads = await client.getThreads();
        if (!threads) {
            window.showErrorMessage("Failed to get running threads from the debugger. Check outputs for more details.");
            return;
        }

        if (!threads.length) {
            window.showErrorMessage("There are no running threads. Check outputs for more details.");
            return;
        }

        if (threads.length > 1) {
            window.showWarningMessage(`There are more than one running threads. ` +
                `Only a single thread is supported; continuing with the first thread. (threadId: ${threads[0].id}, name: ${threads[0].name})`);
        }

        const threadId = threads[0].id;

        const frames = await client.getStackFrames(threadId);

        if (!frames) {
            window.showErrorMessage("Failed to get stack frames from the debugger. Check outputs for more details.");
            return;
        }

        if (!frames.length) {
            window.showErrorMessage("There are no stack frames. Check outputs for more details.");
            return;
        }

        const frameId = frames[0].id;

        const evaluated = await client.evaluate(frameId, 'new Error().stack');
        if (!evaluated) {
            window.showErrorMessage("Failed to evaluate expression via the debugger. Check outputs for more details.");
            return;
        }

        if (evaluated.type !== 'string') {
            window.showErrorMessage(`Expected a string value as evaluation result, but received ${evaluated.type}. Check outputs for more details.`);
            return;
        }

        const stackAtDebugger = evaluated.result.substring(1, -1 + evaluated.result.length);
        const condition = this._computeCondition(kind, stackAtDebugger);
        debug.addBreakpoints([new SourceBreakpoint(new Location(editor.document.uri, editor.selection.start), undefined, condition)]);
    }

    private _computeCondition(kind: BreakpointKind, stackAtDebugger: string): string | undefined {
        /**
         * This is an example of `stackAtDebugger` value:
         *   - "'Error\n    at eval (eval at main (/home/babakks/workspace/dummy-dap/main.js:7:5), <anonymous>:1:1)\n    at main (/home/babakks/workspace/dummy-dap/main.js:7:5)\n    at Object.<anonymous> (/home/babakks/workspace/dummy-dap/main.js:11:1)\n    at Module._compile (node:internal/modules/cjs/loader:1376:14)\n    at Module._extensions..js (node:internal/modules/cjs/loader:1435:10)\n    at Module.load (node:internal/modules/cjs/loader:1207:32)\n    at Module._load (node:internal/modules/cjs/loader:1023:12)\n    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:135:12)\n    at node:internal/main/run_main_module:28:49'"
         */
        if (kind === BreakpointKind.boundToStackTrace) {
            const lines = stackAtDebugger.split(/\r?\n/).slice(2);
            const truncatedLineNumbers = lines.map(line => {
                const ix = line.indexOf('(');
                return line.substring(7, ix !== -1 ? ix : undefined).trim();
            }).join(';');
            return `/* call-stack-bound */ JSON.stringify(new Error().stack.split(/\\r?\\n/).slice(2).map(x=>{const ix=x.indexOf('(');return x.substring(7,ix!==-1?ix:undefined).trim();}).join(';'))===${JSON.stringify(JSON.stringify(truncatedLineNumbers))}`;
        }

        if (kind === BreakpointKind.boundToStackTraceStrict) {
            const lines = stackAtDebugger.split(/\r?\n/).slice(2);
            const trace = lines.map(line => line.substring(7).trim()).join(';');
            return `/* strict-call-stack-bound */ JSON.stringify(new Error().stack.split(/\\r?\\n/).slice(2).map(x=>x.substring(7).trim()).join(';'))===${JSON.stringify(JSON.stringify(trace))}`;
        }
    }

    private _createDAPClient(session: DebugSession): DAPClient {
        return new DAPClient((request: DAPRequest): Promise<any> => {
            let resolve: (value: unknown) => void;
            let resp = new Promise(res => {
                resolve = res;
            });
            try {
                session.customRequest(request.command, request.args).then(value => {
                    this.output.appendLine(`DAP request done:`);
                    this.output.appendLine(`--- Request: ${JSON.stringify(request)}`);
                    this.output.appendLine(`--- Response: ${JSON.stringify(value)}`);
                    resolve(value);
                }, reason => {
                    this.output.appendLine(`DAP request promise rejected:`);
                    this.output.appendLine(`--- Request: ${JSON.stringify(request)}`);
                    this.output.appendLine(`--- Rejection reason: ${reason}`);
                    resolve(reason);
                });
            } catch (e) {
                this.output.appendLine(`Failed to execute DAP request:`);
                this.output.appendLine(`--- Request: ${JSON.stringify(request)}`);
                this.output.appendLine(`--- Error: ${e}`);
                resolve!(e);
            }
            return resp;
        });
    }
}
