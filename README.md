# Matrixes
=========================
Tools for developing with Microservice on Node.js.

## Prerequisites

``` bash
$ npm install protoc-gen-grpc -g
```

## Install

```bash
$ npm install matrixes-cli -g
```

## Command
### Command: Proto
Generate:

* NodeJs source codes
* Typescript d.ts definitions of previous js codes
* Swagger json

from proto files.

```
sasdn proto [options]

  Options:

    -h, --help             output usage information
    -V, --version          output the version number
    -p, --proto <dir>      directory of source proto files
    -o, --output <dir>     directory to output codes
    -i, --import <items>   third party proto import path: e.g path1,path2,path3
    -e, --exclude <items>  files or paths in -p shall be excluded: e.g file1,path1,path2,file2
    -j, --javascript       add -j to output javascript codes
    -t, --typescript       add -t to output typescript d.ts definitions
    -s, --swagger          add -s to output swagger json
    -a, --all              also parse & output all proto files in import path?
```

### Command: Service
Generate rpc server service stubs from proto files.

```
sasdn service [options]

  Options:

    -h, --help              output usage information
    -V, --version           output the version number
    -p, --proto <dir>       directory of proto files
    -o, --output <dir>      directory to output service codes
    -i, --import <items>    third party proto import path: e.g path1,path2,path3
    -e, --exclude <items>   files or paths in -p shall be excluded: e.g file1,path1,path2,file2
```

## Simple
### Simple：Generate js codes
```bash
matrix proto \
--proto ./examples/proto \
--output ./examples/output \
--import ./examples/proto_modules \
--exclude ./examples/proto_modules/google \
--javascript
--all
```

### Simple：Generate d.ts codes
```bash
matrix proto \
--proto ./examples/proto \
--output ./examples/output \
--import ./examples/proto_modules \
--exclude ./examples/proto_modules/google \
--typescript
--all
```

### Simple：Generate swagger json

grpc-gateway is a 3rd framework. We need a sub tool `protoc-gen-swagger` from this framework, to generate swagger json from proto files.

- Gateway tool is built with golang. So install it first, download [here](https://golang.org/dl/).
- Then setup GOPATH following [this](https://github.com/golang/go/wiki/GOPATH).

```bash
// install protoc-gen-swagger
go get -u github.com/grpc-ecosystem/grpc-gateway/protoc-gen-swagger

matrix proto \
--proto ./examples/proto \
--output ./examples/output \
--import ./examples/proto_modules \
--exclude ./examples/proto_modules/google \
--swagger
--all
```

### Simple：Generate service codes
```bash
matrix service \
--proto ./examples/proto \
--output ./examples/output \
--import ./examples/proto_modules \
--exclude ./examples/proto_modules/google \
```