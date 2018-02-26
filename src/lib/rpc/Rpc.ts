import * as grpc from 'grpc';
import {Stream} from "stream";

export type IRpcStatus = grpc.StatusObject;
export type IBatch = {[index: number]: IRpcStatus | grpc.Metadata | boolean};
export type ICallback = (error: Error | null, value?: any) => void;

export interface Call extends Stream {
    startBatch(batch: IBatch, callback: ICallback): void;
}
export interface IServerUnaryCall extends grpc.ServerUnaryCall<RequestType> {
    call: Call;
    metadataSent: boolean;
}
export interface IServerReadableStream extends grpc.ServerReadableStream<RequestType> {
    call: Call;
    metadataSent: boolean;
}
export interface IServerWriteableStream extends grpc.ServerWriteableStream<RequestType> {
    call: Call;
    metadataSent: boolean;
}
export interface IServerDuplexStream extends grpc.ServerDuplexStream<RequestType, ResponseType> {
    call: Call;
    metadataSent: boolean;
}

// redefine ServerCall
export type IRpcServerCall = IServerUnaryCall | IServerReadableStream | IServerWriteableStream | IServerDuplexStream;

// redefine ServerCallback
export type IRpcServerCallback = grpc.sendUnaryData<ResponseType>