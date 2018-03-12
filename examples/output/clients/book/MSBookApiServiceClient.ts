import * as grpc from 'grpc';
import {Duplex, Readable, Writable} from 'stream';
import {GatewayContext, RpcContext} from 'matrixes-lib';
import {BookApiServiceClient} from '../../proto/book/book_grpc_pb';

import {GetBookRequest, Book, GetBookViaAuthorRequest} from '../../proto/book/book_pb';

export default class MSBookApiServiceClient {

    public client: BookApiServiceClient;

    constructor(address: string, ctx?: GatewayContext | RpcContext) {
        this.client = new BookApiServiceClient(address, grpc.credentials.createInsecure());
    }

    // Send IRpcServerUnaryCall
    public getBookApi(request: GetBookRequest, metadata?: grpc.Metadata): Promise<Book> {
        return new Promise((resolve, reject) => {
            this.client.getBookApi(request, metadata, (err: Error, res: Book) => {
                if (err) {
                    return reject(err);
                }
                return resolve(res);
            });
        });
    }

    // Send IRpcServerUnaryCall
    public getBooksViaAuthorApi(request: GetBookViaAuthorRequest, metadata?: grpc.Metadata): Promise<Book> {
        return new Promise((resolve, reject) => {
            this.client.getBooksViaAuthorApi(request, metadata, (err: Error, res: Book) => {
                if (err) {
                    return reject(err);
                }
                return resolve(res);
            });
        });
    }

}
