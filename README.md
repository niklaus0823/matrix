```
protoc --version #libprotoc 3.5.1
grpc_tools_node_protoc --version #libprotoc 3.4.0
```

# generate js codes via grpc-tools
grpc_tools_node_protoc --js_out=import_style=commonjs,binary:./examples/src --grpc_out=./examples/src --proto_path ./examples/proto --proto_path ./examples/proto_extends ./examples/proto/book.proto

# generate d.ts codes
protoc --plugin=protoc-gen-ts=protoc-gen-ts.bat --ts_out=service=true:./examples/src --proto_path ./examples/proto ./examples/proto/book.proto
```

matrixes-protoc --js_out=import_style=commonjs,binary:./examples/src --grpc_out=./examples/src --proto_path ./examples/proto --proto_path ./examples/proto_extends ./examples/proto/book.proto

matrixes-protoc-gen-ts --ts_out=service=true:./examples/src --proto_path ./examples/proto ./examples/proto/book.proto