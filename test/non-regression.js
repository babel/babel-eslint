/*eslint-env mocha*/
"use strict";
var eslint = require("eslint");

function verifyAndAssertMessages(code, rules, expectedMessages) {
  var messages = eslint.linter.verify(
    code,
    {
      parser: require.resolve(".."),
      rules: rules,
      env: {
          node: true
      }
    }
  );

  if (messages.length !== expectedMessages.length) {
    throw new Error("Expected " + expectedMessages.length + " message(s), got " + messages.length);
  }

  messages.forEach(function (message, i) {
    var formatedMessage = message.line + ":" + message.column + " " + message.message + (message.ruleId ? " " + message.ruleId : "");
    if (formatedMessage !== expectedMessages[i]) {
      throw new Error("Message " + i + " does not match:\nExpected: " + expectedMessages[i] + "\nActual:   " + formatedMessage);
    }
  });
}

describe("verify", function () {

  it("arrow function support (issue #1)", function () {
    verifyAndAssertMessages(
      "describe('stuff', () => {});",
      {},
      []
    );
  });

});
