// Mock pino logger for browser/client-side bundling
// pino is a Node.js logger that doesn't work in the browser
const noop = () => {};

const noopLogger = {
  trace: noop,
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
  fatal: noop,
  silent: noop,
  child: () => noopLogger,
  level: "silent",
  isLevelEnabled: () => false,
  levels: { values: {}, labels: {} },
  bindings: () => ({}),
  flush: noop,
  on: noop,
  addListener: noop,
  once: noop,
  removeListener: noop,
  removeAllListeners: noop,
  listeners: () => [],
  emit: noop,
  eventNames: () => [],
  listenerCount: () => 0,
  prependListener: noop,
  prependOnceListener: noop,
  off: noop,
};

function pino() {
  return noopLogger;
}

pino.destination = noop;
pino.transport = noop;
pino.multistream = noop;
pino.levels = { values: {}, labels: {} };
pino.stdSerializers = {};
pino.stdTimeFunctions = {};
pino.symbols = {};
pino.version = "mock";

module.exports = pino;
module.exports.default = pino;
module.exports.pino = pino;
