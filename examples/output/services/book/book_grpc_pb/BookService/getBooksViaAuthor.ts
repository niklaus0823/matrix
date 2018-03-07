import {RpcContext, RpcMiddleware, MiddlewareNext, IRpcServerWriteableStream} from 'matrixes-lib';
import {GetBookViaAuthorRequest, Book} from '../../../../proto/book/book_pb';

export const getBooksViaAuthorHandler: RpcMiddleware = async (ctx: RpcContext, next: MiddlewareNext) => {
    let call = ctx.call as IRpcServerWriteableStream<GetBookViaAuthorRequest>;
    let request = call.request as GetBookViaAuthorRequest;

    await next();

    return Promise.resolve();
};
