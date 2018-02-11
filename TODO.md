# TODO

---

## Base Research
* [google/protobuf](https://github.com/google/protobuf)


```bash
# js_out
$ protoc \
--js_out=import_style=commonjs,binary:./src \
--proto_path ./proto \
--proto_path ./proto_extends \
./proto/gateway/gateway.proto
```

* [google/grpc](https://grpc.io/grpc/node/grpc.html)
  * [grpc-node](https://github.com/grpc/grpc-node): grpc.load(PROTO_PATH)
  * [grpc-tools](https://www.npmjs.com/package/grpc-tools)

  ```bash
    $ grpc_tools_node_protoc \
    	--plugin=protoc-gen-grpc=./node_modules/grpc-tools/bin/grpc_node_plugin.exe \
    	--js_out=import_style=commonjs,binary:./src \
    	--grpc_out=./src \
    	--proto_path ./proto \
    	--proto_path ./proto_extends \
    	./proto/gateway/gateway.proto
  ```

  * [grpc-health-check](https://www.npmjs.com/package/grpc-health-check)

## Tools Research

* [dcodeIO/protobuf.js](https://github.com/dcodeIO/ProtoBuf.js)
  * pbjs
  * pbts
* [improbable-eng/ts-protoc-gen](https://github.com/improbable-eng/ts-protoc-gen)

```bash
$ protoc \
--plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
--js_out=:./src \
--proto_path ./proto \
--proto_path ./proto_extends \
./proto/gateway/gateway.proto
```
## Monitor Research

* [aliyun-node/v8-gc-log-parser](https://github.com/aliyun-node/v8-gc-log-parser)
* [dainis/node-gcstats](https://github.com/dainis/node-gcstats)
