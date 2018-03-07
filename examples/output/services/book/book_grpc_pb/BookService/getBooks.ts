import {RpcContext, RpcMiddleware, MiddlewareNext, IRpcServerDuplexStream} from 'matrixes-lib';
import {GetBookRequest, Book} from '../../../../proto/book/book_pb';

export const getBooksHandler: RpcMiddleware = async (ctx: RpcContext, next: MiddlewareNext) => {
    let call = ctx.call as IRpcServerDuplexStream<GetBookRequest, Book>;

    await next();

    return Promise.resolve();
};
