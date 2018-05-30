# hyperion

[![Circle CI](https://circleci.com/gh/thegecko/hyperion.svg?style=shield)](https://circleci.com/gh/thegecko/hyperion/)

gRPC messages over IPC or WebSockets using TypeScript


This repository showcases how [gRPC](https://grpc.io/) methods can be implemented in a client-server JavaScript infrastructure, specifically using a WebSocket in a web application scenario or electron IPC in an electron application.

Transport abstractions exist to hide the implementation from the user interface to promote common functionality and workflows in both setups.

## Why consider gRPC?

[gRPC](https://grpc.io/) is becoming popular in service architectures and considering this approach in other areas across the application stack promotes interoperation.

### Pros
- Services and messages are defined using a simple and agreed definition language. This promotes contract-first development decoupling client and service implementations and dependencies between them.
- Messages are encoded into small binary packets, making them faster to transmit across networks.
- Services and messages are strongly-typed (where languages support this) promoting compile-time checking of service usage and template generation through abstract classes.
- Services can support streamed request and response messages which allow large amounts of data to be transferred without excessive buffering.
- Messages can be easily passed/proxied to services implementing gRPC without decoding or transformation.

### Cons
 - The overhead of encoding/decoding messages into their binary representations may have a negative impact on IPC performance. This has yet to be tested and could be mitigated by passing messages un-encoded.

## Prerequisites

[Node.js > v8.11.1](https://nodejs.org)

[yarn](https://yarnpkg.com), installed using:

```bash
$ npm install -g yarn
```

## Installation

After cloning this repository, install the dependencies:

```bash
$ yarn install
```

A `postinstall` hook also bootstraps the monorepo using [lerna](https://github.com/lerna/lerna)

## Building and Running

To build all the projects:

```bash
$ yarn build
```

You can then run a project by using one of the following commands:

```bash
$ yarn server
$ yarn desktop
```

## Development

Run a development environment which reloads with any changes using the following commands.

```bash
$ yarn watch:server
$ yarn watch:desktop
```

Clean commands are also available. To remove all built artifacts, use this command:

```bash
$ yarn clean
```

To remove all node_modules as well which leaves just the source, use this command:

```bash
$ yarn clean:all
```

_Note:_ You must install the node modules again after using this command with `yarn install`.

## How it works

### Protocol buffers

[Protocol buffers](https://developers.google.com/protocol-buffers/) are the messages underpinning gRPC. This repository contains two `.proto` files representing services and messages in the `proto` folder:

- `system.proto` outlines a system service with a simple `version` method and a `time` method which returns a stream.
- `rpc.proto` is a special interface which outlines a format for encoding any messages over sockets.

### Code generation

The `gulpfile` in each package downloads the proto files in turn and uses the [protobuf-templates](https://www.npmjs.com/package/protobuf-templates) npm package to generate client or server TypeScript code as part of the build system.

For server generation, an abstract class is generated for each service which simply needs to be inherited from and completed in order to implement that service.

For client generation, a class is created which allows a client to call a remote service.

Both of the types of class generated utilise injected methods for encoding/decoding as well as transport hooks in order to keep the code generation decoupled from the implementation.

### Encoding / decoding

The auto-generated classes require injection of a protobuf `reader` and `writer` function when instatiated. These functions essentially encode and decode the messages to/from protobuf and follow the interface of the `Reader` and `Writer` classes in the [protobufjs](https://www.npmjs.com/package/protobufjs) npm package.

This injection allows modification of the encoding/decoding and decouples the code from third party libraries if required.

### Bridging domains

After being encoded, each service message is itself added to another message which represents the remote procedure call. The format of these messages are outlined in the special `rpc.proto` file.

This allows further information about the request/response to be encoded such as the service and method being called as well as a request ID (for matching asynchronous responses).

### Client implementation

On the client side, auto-generation is undertaken using the `client` protobuf-template in the gulpfile and files output to the `_proto` directory. Each auto-generated service is exposed as a strongly-typed singleton to the application and also registered with a `bridge` implementation for IPC or WebSockets (see `services` folder).

The bridge is responsible for supplying Reader and Writer implementations to each client service and managing the encoded messages over the transport. When a message is sent, it is wrapped into an RPC message with a unique ID and is sent on. Responses from the server are decoded, coupled to the correct callback ID (if present) and passed back to the caller.

`websocket-bridge.ts` implements the websocket client and `ipc-bridge.ts` implements the IPC client.

__Note:__ the `ipc-bridge` implementation is primarily exposed in the electron main process in a restricted `preload` process in order to adhere with [security best practices](https://github.com/electron/electron/blob/master/docs/tutorial/security.md). A small wrapper for it then exists in the UI.

### Server implementation

On the server side (both desktop and browser server), auto-generation is undertaken using the `server` protobuf-template in the gulpfile and files output to the `_proto` directory.

The generated code exposes abstract server classes which can be implemented by an inherited class. This means developemnt IDEs can take advantage of the strongly-typed interfaces and allow the developer to just "fill in the blanks":

![screen shot 2018-05-30 at 20 36 04](https://user-images.githubusercontent.com/61341/40743443-73ee12f8-6449-11e8-83b3-9b7dff0e4f00.png)

![screen shot 2018-05-30 at 20 36 22](https://user-images.githubusercontent.com/61341/40743420-61350838-6449-11e8-9a1e-ab092ff51dbd.png)

Each backend implements a message handler which is responsible for supplying Reader and Writer implementations to each service and managing the encoded messages over the transport. This is similar to the client bridge, but in reverse.

Each service implementation is registered with the handler (see the `services` folder), so that a received message over the transport can be decoded and marshalled to the correct service implementation. The request message is then decoded and passed into the inherited class being implemented. IDs are used to couple requests and responses in a similar manner to the bridges.

`websocket-handler.ts` implements the websocket server handler and `ipc-handler.ts` implements the IPC handler.

### Message types

Many RPC implementations simply send and receive a single structured message. However, gRPC can support streamed messages. When streams are used, the developer interacts with a stream-like object which can emit "data" or "end" events instead of calling a method and receiving a callback.

Please refer to the `time` method implementation for an example of a streamed response.
