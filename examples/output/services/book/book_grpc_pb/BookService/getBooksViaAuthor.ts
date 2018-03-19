import {RpcContext, RpcMiddleware, MiddlewareNext, IRpcServerWriteableStream, joi, joiType} from 'matrixes-lib';
import {GetBookViaAuthorRequest, Book} from '../../../../proto/book/book_pb';

export const getBooksViaAuthorHandler: RpcMiddleware = async (ctx: RpcContext, next: MiddlewareNext) => {
    let call = ctx.call as IRpcServerWriteableStream<GetBookViaAuthorRequest>;
    let request = call.request as GetBookViaAuthorRequest;

    try {
        await ctx.validate(request, {
            author: joiType.vString.activate().required().min(5).max(10),
        });
        call.write(new Book());
    } catch (e) {
        call.emit('error', e);
    }

    call.end();

    await next();

    return Promise.resolve();
};
