import {RpcContext, RpcMiddleware, MiddlewareNext, IRpcServerCallback, IRpcServerReadableStream} from 'matrixes-lib';
import {GetBookRequest, Book} from '../../../../proto/book/book_pb';

export const getGreatestBookHandler: RpcMiddleware = async (ctx: RpcContext, next: MiddlewareNext) => {
    let call = ctx.call as IRpcServerReadableStream<GetBookRequest>;
    let callback = ctx.callback as IRpcServerCallback<Book>;

    await next();

    return Promise.resolve();
};
