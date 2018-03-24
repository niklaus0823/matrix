import {RpcContext, RpcMiddleware, MiddlewareNext, IRpcServerCallback, IRpcServerReadableStream, joi, joiType} from 'matrixes-lib';
import {GetBookRequest, Book} from '../../../../proto/book/book_pb';

export const getGreatestBookHandler: RpcMiddleware = async (ctx: RpcContext, next: MiddlewareNext) => {
    let call = ctx.call as IRpcServerReadableStream<GetBookRequest>;
    let callback = ctx.callback as IRpcServerCallback<Book>;

    call.on('data', async (request: GetBookRequest) => {
        try {
            await ctx.validate(request, {
                isbn: joiType.vInt64.activate().required().greater(5).less(10),
            });
            callback(null, new Book());
        } catch (e) {
            callback(e, null);
        }
    });

    await next();

    return Promise.resolve();
};
