import * as assert from 'assert';
import {status as GrpcStatus, Metadata} from 'grpc';

import {IBatch, IRpcStatus, IRpcServerCall, IRpcServerCallback} from './Rpc';
import {RpcApplication} from './App';

export enum GrpcOpType {
    SEND_INITIAL_METADATA = 0,
    SEND_MESSAGE = 1,
    SEND_CLOSE_FROM_CLIENT = 2,
    SEND_STATUS_FROM_SERVER = 3,
    RECV_INITIAL_METADATA = 4,
    RECV_MESSAGE = 5,
    RECV_STATUS_ON_CLIENT = 6,
    RECV_CLOSE_ON_SERVER = 7,
}

export class RpcContext {

    public app: RpcApplication;
    public call: IRpcServerCall;
    public callback: IRpcServerCallback;

    constructor() {
        // do nothing
    }

    /**
     * Handle error with gRPC status.
     * @see {@link https://github.com/grpc/grpc/blob/v1.3.7/src/node/src/server.js#L69-L101}
     * @param {Error} err
     */
    public onError(err: Error) {
        assert(err instanceof Error, `non-error thrown: ${err}`);

        let call = this.call;
        let statusMetadata = new Metadata();
        let status = {
            code: GrpcStatus.UNKNOWN,
            details: 'Unknown Error'
        } as IRpcStatus;

        if (err.hasOwnProperty('message')) {
            status.details = err.message;
        }
        if (err.hasOwnProperty('code')) {
            status.code = (err as any).code;
            if (err.hasOwnProperty('details')) {
                status.details = (err as any).details;
            }
        }
        if (err.hasOwnProperty('metadata')) {
            statusMetadata = (err as any).metadata;
        }
        status.metadata = statusMetadata;

        let errorBatch: IBatch = {};
        if (!call.metadataSent) {
            errorBatch[GrpcOpType.SEND_INITIAL_METADATA] = new Metadata();
        }

        errorBatch[GrpcOpType.SEND_STATUS_FROM_SERVER] = status;
        call.call.startBatch(errorBatch, () => {
            // do nothingc rf
        });
    }

}