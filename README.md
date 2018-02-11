# generate js codes via grpc-tools
grpc_tools_node_protoc --js_out=import_style=commonjs,binary:./examples/src --grpc_out=./examples/src --proto_path ./examples/proto --proto_path ./examples/proto_extends ./examples/proto/user.proto

# generate d.ts codes
protoc --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts --ts_out=./examples/src -I ./examples/proto ./examples/proto/user.proto
```