"use strict";
/** @module Base */
/** Module dependencies. */

var diff = require("diff");
var milliseconds = require("ms");
var utils = require("./utils");
var supportsColor = require("supports-color");
var EVENT_TEST_PASS = "pass";
var EVENT_TEST_FAIL = "fail";

var isBrowser = require("./utils").isBrowser;

function getBrowserWindowSize() {
  if ("innerHeight" in global) {
    return [global.innerHeight, global.innerWidth];
  }

  // In a Web Worker, the DOM Window is not available.
  return [640, 480];
}

/** Expose `Base`. */

exports = module.exports = Base;

/** Check if both stdio streams are associated with a tty. */

var isatty = isBrowser ? true : process.stdout.isTTY && process.stderr.isTTY;

/** Save log references to avoid tests interfering (see GH-3604). */
var consoleLog = console.log;

/** Enable coloring by default, except in the browser interface. */

exports.useColors =
  !utils.isBrowser() && (supportsColor.stdout || process.env.MOCHA_COLORS !== undefined);

/** Inline diffs instead of +/- */

exports.inlineDiffs = false;

/** Default color map. */

exports.colors = {
  "pass": 90,
  "fail": 31,
  "bright pass": 92,
  "bright fail": 91,
  "bright yellow": 93,
  "pending": 36,
  "suite": 0,
  "error title": 0,
  "error message": 31,
  "error stack": 90,
  "checkmark": 32,
  "fast": 90,
  "medium": 33,
  "slow": 31,
  "green": 32,
  "light": 90,
  "diff gutter": 90,
  "diff added": 32,
  "diff removed": 31,
  "diff added inline": "30;42",
  "diff removed inline": "30;41",
};

/** Default symbol map. */

exports.symbols = {
  ok: "✓",
  err: "✖",
  dot: "․",
  comma: ",",
  bang: "!",
};

// With node.js on Windows: use symbols available in terminal default fonts
if (process.platform === "win32") {
  exports.symbols.ok = "\u221A";
  exports.symbols.err = "\u00D7";
  exports.symbols.dot = ".";
}

/**
 * Color `str` with the given `type`, allowing colors to be disabled, as well as user-defined color
 * schemes.
 *
 * @private
 * @param {string} type
 * @param {string} str
 * @returns {string}
 */
var color = (exports.color = function (type, str) {
  if (!exports.useColors) {
    return String(str);
  }

  return "\u001b[" + exports.colors[type] + "m" + str + "\u001b[0m";
});

/** Expose term window size, with some defaults for when stderr is not a tty. */

exports.window = {
  width: 75,
};

if (isatty) {
  if (isBrowser) {
    exports.window.width = getBrowserWindowSize()[1];
  } else {
    exports.window.width = process.stdout.getWindowSize(1)[0];
  }
}

/** Expose some basic cursor interactions that are common among reporters. */

exports.cursor = {
  hide: function () {
    isatty && process.stdout.write("\u001b[?25l");
  },

  show: function () {
    isatty && process.stdout.write("\u001b[?25h");
  },

  deleteLine: function () {
    isatty && process.stdout.write("\u001b[2K");
  },

  beginningOfLine: function () {
    isatty && process.stdout.write("\u001b[0G");
  },

  CR: function () {
    if (isatty) {
      exports.cursor.deleteLine();
      exports.cursor.beginningOfLine();
    } else {
      process.stdout.write("\r");
    }
  },
};

var showDiff = (exports.showDiff = function (err) {
  return (
    err &&
    err.showDiff !== false &&
    sameType(err.actual, err.expected) &&
    err.expected !== undefined
  );
});

function stringifyDiffObjs(err) {
  if (!utils.isString(err.actual) || !utils.isString(err.expected)) {
    err.actual = utils.stringify(err.actual);
    err.expected = utils.stringify(err.expected);
  }
}

/**
 * Returns a diff between 2 strings with coloured ANSI output.
 *
 * The diff will be either inline or unified dependent on the value of `Base.inlineDiff`.
 *
 * @param {string} actual
 * @param {string} expected
 * @returns {string} Diff
 */
var generateDiff = (exports.generateDiff = function (actual, expected) {
  try {
    return exports.inlineDiffs ? inlineDiff(actual, expected) : unifiedDiff(actual, expected);
  } catch {
    var msg =
      "\n      " +
      color("diff added", "+ expected") +
      " " +
      color("diff removed", "- actual:  failed to generate Mocha diff") +
      "\n";
    return msg;
  }
});

/**
 * Outputs the given `failures` as a list.
 *
 * @memberof Mocha.reporters.Base
 * @param {Object[]} failures - Each is Test instance with corresponding Error property
 * @public
 * @variation 1
 */
exports.list = function (failures) {
  var multipleErr;
  var multipleTest;
  Base.consoleLog();
  failures.forEach(function (test, i) {
    // Format
    var fmt =
      color("error title", "  %s) %s:\n") +
      color("error message", "     %s") +
      color("error stack", "\n%s\n");

    // Msg
    var msg;
    var err;
    if (test.err && test.err.multiple) {
      if (multipleTest !== test) {
        multipleTest = test;
        multipleErr = [test.err].concat(test.err.multiple);
      }

      err = multipleErr.shift();
    } else {
      err = test.err;
    }

    var message;
    if (err.message && typeof err.message.toString === "function") {
      message = String(err.message);
    } else if (typeof err.inspect === "function") {
      message = String(err.inspect());
    } else {
      message = "";
    }

    var stack = err.stack || message;
    var index = message ? stack.indexOf(message) : -1;

    if (index === -1) {
      msg = message;
    } else {
      index += message.length;
      msg = stack.slice(0, index);
      // Remove msg from stack
      stack = stack.slice(index + 1);
    }

    // Uncaught
    if (err.uncaught) {
      msg = "Uncaught " + msg;
    }

    // Explicitly show diff
    if (!exports.hideDiff && showDiff(err)) {
      stringifyDiffObjs(err);
      fmt = color("error title", "  %s) %s:\n%s") + color("error stack", "\n%s\n");
      var match = message.match(/^([^:]+): expected/);
      msg = "\n      " + color("error message", match ? match[1] : msg);

      msg += generateDiff(err.actual, err.expected);
    }

    // Indent stack trace
    stack = stack.replace(/^/gm, "  ");

    // Indented test title
    var testTitle = "";
    test.titlePath().forEach(function (str, index) {
      if (index !== 0) {
        testTitle += "\n     ";
      }

      for (var i = 0; i < index; i++) {
        testTitle += "  ";
      }

      testTitle += str;
    });

    Base.consoleLog(fmt, i + 1, testTitle, msg, stack);
  });
};

/**
 * Constructs a new `Base` reporter instance.
 *
 * All other reporters generally inherit from this reporter.
 *
 * @memberof Mocha.reporters
 * @class
 * @param {Runner} runner - Instance triggers reporter actions.
 * @param {Object} [options] - Runner options
 * @public
 */
function Base(runner, options) {
  var failures = (this.failures = []);

  if (!runner) {
    throw new TypeError("Missing runner argument");
  }

  this.options = options || {};
  this.runner = runner;
  this.stats = runner.stats; // Assigned so Reporters keep a closer reference

  runner.on(EVENT_TEST_PASS, function (test) {
    if (test.duration > test.slow()) {
      test.speed = "slow";
    } else if (test.duration > test.slow() / 2) {
      test.speed = "medium";
    } else {
      test.speed = "fast";
    }
  });

  runner.on(EVENT_TEST_FAIL, function (test, err) {
    if (showDiff(err)) {
      stringifyDiffObjs(err);
    }

    // More than one error per test
    if (test.err && err instanceof Error) {
      test.err.multiple = (test.err.multiple || []).concat(err);
    } else {
      test.err = err;
    }

    failures.push(test);
  });
}

/**
 * Outputs common epilogue used by many of the bundled reporters.
 *
 * @memberof Mocha.reporters
 * @public
 */
Base.prototype.epilogue = function () {
  var stats = this.stats;
  var fmt;

  Base.consoleLog();

  // Passes
  fmt = color("bright pass", " ") + color("green", " %d passing") + color("light", " (%s)");

  Base.consoleLog(fmt, stats.passes || 0, milliseconds(stats.duration));

  // Pending
  if (stats.pending) {
    fmt = color("pending", " ") + color("pending", " %d pending");

    Base.consoleLog(fmt, stats.pending);
  }

  // Failures
  if (stats.failures) {
    fmt = color("fail", "  %d failing");

    Base.consoleLog(fmt, stats.failures);

    Base.list(this.failures);
    Base.consoleLog();
  }

  Base.consoleLog();
};

/**
 * Pads the given `str` to `len`.
 *
 * @private
 * @param {string} str
 * @param {string} len
 * @returns {string}
 */
function pad(str, len) {
  str = String(str);
  return Array(len - str.length + 1).join(" ") + str;
}

/**
 * Returns inline diff between 2 strings with coloured ANSI output.
 *
 * @private
 * @param {String} actual
 * @param {String} expected
 * @returns {string} Diff
 */
function inlineDiff(actual, expected) {
  var msg = errorDiff(actual, expected);

  // Linenos
  var lines = msg.split("\n");
  if (lines.length > 4) {
    var width = String(lines.length).length;
    msg = lines
      .map(function (str, i) {
        return pad(++i, width) + " |" + " " + str;
      })
      .join("\n");
  }

  // Legend
  msg =
    "\n" +
    color("diff removed inline", "actual") +
    " " +
    color("diff added inline", "expected") +
    "\n\n" +
    msg +
    "\n";

  // Indent
  msg = msg.replace(/^/gm, "      ");
  return msg;
}

/**
 * Returns unified diff between two strings with coloured ANSI output.
 *
 * @private
 * @param {String} actual
 * @param {String} expected
 * @returns {string} The diff.
 */
function unifiedDiff(actual, expected) {
  var indent = "      ";
  function cleanUp(line) {
    if (line[0] === "+") {
      return indent + colorLines("diff added", line);
    }

    if (line[0] === "-") {
      return indent + colorLines("diff removed", line);
    }

    if (line.match(/@@/)) {
      return "--";
    }

    if (line.match(/\\ No newline/)) {
      return null;
    }

    return indent + line;
  }

  function notBlank(line) {
    return typeof line !== "undefined" && line !== null;
  }

  var msg = diff.createPatch("string", actual, expected);
  var lines = msg.split("\n").splice(5);
  return (
    "\n      " +
    colorLines("diff added", "+ expected") +
    " " +
    colorLines("diff removed", "- actual") +
    "\n\n" +
    lines.map(cleanUp).filter(notBlank).join("\n")
  );
}

/**
 * Returns character diff for `err`.
 *
 * @private
 * @param {String} actual
 * @param {String} expected
 * @returns {string} The diff
 */
function errorDiff(actual, expected) {
  return diff
    .diffWordsWithSpace(actual, expected)
    .map(function (str) {
      if (str.added) {
        return colorLines("diff added inline", str.value);
      }

      if (str.removed) {
        return colorLines("diff removed inline", str.value);
      }

      return str.value;
    })
    .join("");
}

/**
 * Colors lines for `str`, using the color `name`.
 *
 * @private
 * @param {string} name
 * @param {string} str
 * @returns {string}
 */
function colorLines(name, str) {
  return str
    .split("\n")
    .map(function (str) {
      return color(name, str);
    })
    .join("\n");
}

/** Object#toString reference. */
var objToString = Object.prototype.toString;

/**
 * Checks that a / b have the same type.
 *
 * @private
 * @param {Object} a
 * @param {Object} b
 * @returns {boolean}
 */
function sameType(a, b) {
  return objToString.call(a) === objToString.call(b);
}

Base.consoleLog = consoleLog;

Base.abstract = true;
