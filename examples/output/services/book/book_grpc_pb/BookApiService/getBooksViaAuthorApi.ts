import {RpcContext, RpcMiddleware, MiddlewareNext, IRpcServerCallback, IRpcServerUnaryCall} from 'matrixes-lib';
import {GetBookViaAuthorRequest, Book} from '../../../../proto/book/book_pb';

export const getBooksViaAuthorApiHandler: RpcMiddleware = async (ctx: RpcContext, next: MiddlewareNext) => {
    let call = ctx.call as IRpcServerUnaryCall<GetBookViaAuthorRequest>;
    let callback = ctx.callback as IRpcServerCallback<Book>;
    let request = call.request as GetBookViaAuthorRequest;

    await next();

    return Promise.resolve();
};
