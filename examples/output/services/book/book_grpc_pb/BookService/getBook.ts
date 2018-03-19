import {RpcContext, RpcMiddleware, MiddlewareNext, IRpcServerCallback, IRpcServerUnaryCall, joi, joiType} from 'matrixes-lib';
import {GetBookRequest, Book} from '../../../../proto/book/book_pb';

export const getBookHandler: RpcMiddleware = async (ctx: RpcContext, next: MiddlewareNext) => {
    let call = ctx.call as IRpcServerUnaryCall<GetBookRequest>;
    let callback = ctx.callback as IRpcServerCallback<Book>;
    let request = call.request as GetBookRequest;

    try {
        await ctx.validate(request, {
            isbn: joiType.vInt64.activate().required().greater(5).less(10),
        });
        callback(null, new Book());
    } catch (e) {
        callback(e, null);
    }

    await next();

    return Promise.resolve();
};
