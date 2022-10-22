class MissingParameterError extends Error {
  constructor(arg) {
    super(`Missing parameter(s): ${arg}`);
  }
}

class ParameterRangeError extends Error {
  constructor(arg, min, max) {
    super(`Parameter "${arg}" must be between ${min} and ${max}`);
  }
}

class ParameterTypeMismatchError extends Error {
  constructor(arg, type) {
    super(`Invalid parameter(s): ${arg} (expected ${type})`);
  }
}

class WebsocketConnectionError extends Error {
  constructor(status) {
    switch (status) {
      case 0:
        super("Websocket has been created, but has not yet connected");
      case 2:
        super("Websocket is closing / has been closed");
      case 3:
        super("Websocket has been closed or failed to connect");
      default:
        break;
    }
  }
}

module.exports = { MissingParameterError, ParameterRangeError, ParameterTypeMismatchError, WebsocketConnectionError };