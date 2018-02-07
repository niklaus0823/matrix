# TODO

---

## Base Research
* [google/protobuf](https://github.com/google/protobuf)
* [google/grpc](https://grpc.io/grpc/node/grpc.html)
  * [grpc-node](https://github.com/grpc/grpc-node): grpc.load(PROTO_PATH)
  * [grpc-tools](https://www.npmjs.com/package/grpc-tools)
  * [grpc-health-check](https://www.npmjs.com/package/grpc-health-check)

## Tools Research

* [dcodeIO/protobuf.js](https://github.com/dcodeIO/ProtoBuf.js)
  * pbjs
  * pbts
* [agreatfool/grpc_tools_node_protoc_ts](https://github.com/agreatfool/grpc_tools_node_protoc_ts)
* [improbable-eng/ts-protoc-gen](https://github.com/improbable-eng/ts-protoc-gen)

## Monitor Research

* [aliyun-node/v8-gc-log-parser](https://github.com/aliyun-node/v8-gc-log-parser)
* [dainis/node-gcstats](https://github.com/dainis/node-gcstats)



# Others

.proto ->

* grpc.load(PROTO_PATH) -> proto package client/server/schema
* pbjs/pbts -> compiled.js compiled.d.ts -> client/server/schema
* protoc plugins -> proto.js，proto.d.ts，proto_grpc.js，proto_grpc.ts -> client/server/schema