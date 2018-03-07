import {RpcContext, RpcMiddleware, MiddlewareNext, IRpcServerCallback, IRpcServerUnaryCall} from 'matrixes-lib';
import {GetBookRequest, Book} from '../../../../proto/book/book_pb';

export const getBookApiHandler: RpcMiddleware = async (ctx: RpcContext, next: MiddlewareNext) => {
    let call = ctx.call as IRpcServerUnaryCall<GetBookRequest>;
    let callback = ctx.callback as IRpcServerCallback<Book>;
    let request = call.request as GetBookRequest;

    await next();

    return Promise.resolve();
};
