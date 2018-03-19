import {RpcContext, RpcMiddleware, MiddlewareNext, IRpcServerDuplexStream, joi, joiType} from 'matrixes-lib';
import {GetBookRequest, Book} from '../../../../proto/book/book_pb';

export const getBooksHandler: RpcMiddleware = async (ctx: RpcContext, next: MiddlewareNext) => {
    let call = ctx.call as IRpcServerDuplexStream<GetBookRequest, Book>;

    call.on('data', async (request: GetBookRequest) => {
        try {
            await ctx.validate(request, {
                isbn: joiType.vInt64.activate().required().greater(5).less(10),
            });
            call.write(new Book());
        } catch (e) {
            call.emit('error', e);
        }
    });

    call.end();

    await next();

    return Promise.resolve();
};
