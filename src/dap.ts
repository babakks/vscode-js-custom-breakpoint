export interface DAPRequest {
    command: string;
    args?: any;
}

export interface DAPThread {
    id: number;
    name: string;
}

interface DAPThreadsResponse {
    threads: { id: number; name: string; }[];
}

export interface DAPStackFrame {
    id: number;
    name: string;
}

interface DAPStackFramesResponse {
    stackFrames: { id: number; name: string; }[];
}

export interface DAPEvaluate {
    type: string;
    result: string;
}

interface DAPEvaluateResponse {
    type: string;
    result: string;
}

export type DAPClientRequestFunction = (request: DAPRequest) => Promise<any>;

export class DAPClient {
    constructor(readonly requestFunction: DAPClientRequestFunction) { }

    async getThreads(): Promise<DAPThread[] | undefined> {
        const resp: DAPThreadsResponse | undefined = await this.requestFunction({ command: 'threads' });
        return resp?.threads.map(x => ({
            id: x.id,
            name: x.name,
        }));
    }

    async getStackFrames(threadId: number): Promise<DAPStackFrame[] | undefined> {
        const resp: DAPStackFramesResponse | undefined = await this.requestFunction({
            command: 'stackTrace',
            args: { threadId },
        });
        return resp?.stackFrames.map(x => ({
            id: x.id,
            name: x.name,
        }));
    }

    async evaluate(frameId: number, expression: string): Promise<DAPEvaluate | undefined> {
        const resp: DAPEvaluateResponse | undefined = await this.requestFunction({
            command: 'evaluate',
            args: { frameId, expression },
        });
        return resp ? {
            type: resp.type,
            result: resp.result,
        } : undefined;
    }
}
