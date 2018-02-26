import * as grpc from 'grpc';
import * as joi from "joi";
import * as EventEmitter from "events";
import {Stream} from "stream";
import {Context as KoaContext, Middleware as KoaMiddleware, Request as KoaRequest} from "koa";

export declare type IRpcStatus = grpc.StatusObject;
export declare type IBatch = {[index: number]: IRpcStatus | grpc.Metadata | boolean};
export declare type ICallback = (error: Error | null, value?: any) => void;

export declare interface Call extends Stream {
    startBatch(batch: IBatch, callback: ICallback): void;
}
export declare interface IServerUnaryCall extends grpc.ServerUnaryCall<RequestType> {
    call: Call;
    metadataSent: boolean;
}
export declare interface IServerReadableStream extends grpc.ServerReadableStream<RequestType> {
    call: Call;
    metadataSent: boolean;
}
export declare interface IServerWriteableStream extends grpc.ServerWriteableStream<RequestType> {
    call: Call;
    metadataSent: boolean;
}
export declare interface IServerDuplexStream extends grpc.ServerDuplexStream<RequestType, ResponseType> {
    call: Call;
    metadataSent: boolean;
}

// redefine ServerCall
export declare type IRpcServerCall = IServerUnaryCall | IServerReadableStream | IServerWriteableStream | IServerDuplexStream;

// redefine ServerCallback
export declare type IRpcServerCallback = grpc.sendUnaryData<ResponseType>

export declare type RpcMiddleware = (ctx: RpcContext, next: MiddlewareNext) => Promise<any>;
export declare type MiddlewareNext = () => Promise<any>;
export declare type WrappedHandler = (call: IRpcServerCall, callback?: IRpcServerCallback) => Promise<any>;

export declare class RpcApplication extends EventEmitter {
    constructor();

    /**
     * Get the gRPC Server.
     * @returns {Server}
     */
    readonly server: grpc.Server;

    /**
     * Bind the server with a port and a given credential.
     * @param {string} address format: "address:port"
     * @param {ServerCredentials} creds optional
     * @returns {RpcApplication}
     */
    bind(address: string, creds?: grpc.ServerCredentials): RpcApplication;

    /**
     * Start the RpcApplication server.
     */
    start(): void;

    /**
     * Use the given middleware.
     * @param {RpcMiddleware} middleware
     * @returns {RpcApplication}
     */
    use(middleware: RpcMiddleware): this;

    /**
     * Wrap gRPC handler with other middleware.
     * @param {RpcMiddleware} reqHandler
     * @returns {WrappedHandler}
     */
    wrapGrpcHandler(reqHandler: RpcMiddleware): (call: IRpcServerCall, callback?: IRpcServerCallback) => Promise<void>;
}

export declare enum GrpcOpType {
    SEND_INITIAL_METADATA = 0,
    SEND_MESSAGE = 1,
    SEND_CLOSE_FROM_CLIENT = 2,
    SEND_STATUS_FROM_SERVER = 3,
    RECV_INITIAL_METADATA = 4,
    RECV_MESSAGE = 5,
    RECV_STATUS_ON_CLIENT = 6,
    RECV_CLOSE_ON_SERVER = 7,
}

export declare class RpcContext {
    app: RpcApplication;
    call: IRpcServerCall;
    callback: IRpcServerCallback;

    constructor();

    /**
     * Handle error with gRPC status.
     * @see {@link https://github.com/grpc/grpc/blob/v1.3.7/src/node/src/server.js#L69-L101}
     * @param {Error} err
     */
    onError(err: Error): void;
}

export interface GatewayContext extends KoaContext {
    params: any;
    request: GatewayRequest;
}
export interface GatewayRequest extends KoaRequest {
    body: any;
}
export interface GatewayJoiSchema {
    type: string;
    required: boolean;
    schema?: GatewayJoiSchemaMap;
}
export interface GatewayJoiSchemaMap {
    [name: string]: GatewayJoiSchema;
}
export interface GatewayApiParams {
    [key: string]: any;
}
export declare abstract class GatewayApiBase {
    method: string;
    uri: string;
    type: string;
    schemaDefObj: GatewayJoiSchemaMap;

    abstract handle(ctx: GatewayContext, next: MiddlewareNext, params: GatewayApiParams): Promise<any>;

    register(): Array<string | KoaMiddleware>;
}