"use strict";

// In a array of tokens, aggregates some tokens into a single Template token
// so that the resulting tokens array will contain for each template string:
//   * one template token from the starting backquote to the first embedded
//     expression starting by '${'
//   * one template token from the end of the embedded expression '}' to the
//     beginning of the next one…
//   * and so on till end of the template string, the last token containing
//     the closing backquote.
//
// Examples: (the resulting template tokens are underlined with successive '^')
//   var a = `Result: ${result}.`;
//           ^^^^^^^^^^^      ^^^
//   var a = `Result: ${result1} ${result1}.`;
//           ^^^^^^^^^^^       ^^^^       ^^^
//   var a = `Result: ${result + `sss` }.`;
//           ^^^^^^^^^^^         ^^^^^ ^^^
//   var a = `Result: ${result + `${suffix}` }.`;
//           ^^^^^^^^^^^         ^^^      ^^ ^^^
module.exports = function(tokens, tt) {
  // As long as we will iterate through the tokens array, we'll maintain a stack of
  // contexts. This stack will alternate:
  //   * template context (for strings): they have `isTemplate` set to `true`, and
  //     keep in `index` property the index of the token (in the array) that started
  //     the template;
  //   * non-template contexts (for JavaScript code): they have `isTemplate` set to
  //     `false`, and keep a number of opened braces ('{', i.e. the ones that were
  //     not closed with '}').
  // The top (i.e. last) context in the stack is the current one.
  const contextStack = initContextStack();

  // At the beginning, we are not in a template.
  contextStack.pushNewNonTemplateContext();

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];

    if (contextStack.current().isTemplate) {
      // We are in a template…

      // If we encounter a '${' or a '`', we go out of template (string) mode and create
      // a template token. But the behavior differs depending on '${' or '`'…
      if (token.type === tt.dollarBraceL) {
        // If '${', then we begin a new expression with its own context. This means that
        // we add a new context to the stack, and define it as the current context.
        index = createTemplateTokenAndReturnNewIndex(index);
        contextStack.pushNewNonTemplateContext();
      } else if (token.type === tt.backQuote) {
        // If '`', then we go back to the previous expression (the one before the template
        // string began). We restore the previous context, with its numOfBraces.
        index = createTemplateTokenAndReturnNewIndex(index);
        contextStack.popContext();
      }

      // If not a '${' or a '`', we just keep going.
    } else {
      // We are out of a template…

      // If we encounter a '`' or a '}' (and there is no not-closed '{'), we go in template
      // (string) mode. Again two cases to handle:
      if (token.type === tt.backQuote) {
        // If '`', we begin a new template string, so we add a new context to the stack, and
        // set it as the current context.
        contextStack.pushNewTemplateContext(index);
      } else if (
        contextStack.current().numBraces === 0 &&
        token.type === tt.braceR
      ) {
        // If '}', then we go back to the previous template string (that was "interrupted" by
        // an embedded expression '${...}'), so we go back to the previous context.
        contextStack.popContext();
        contextStack.current().startIndex = index;
        // Note that `contextStack.current().isTemplate` is already `true`.
      } else if (token.type === tt.braceL) {
        // In the case we encounter a '{', we increment the current number of openened braces.
        contextStack.current().numBraces++;
      } else if (token.type === tt.braceR) {
        // And if '}' (and it's not been identified as the end of an embedded expression), we
        // decrement the current number of opened braces.
        contextStack.current().numBraces--;
      }
    }
  }

  // Helper function to create a contexts stack, with methods to manipulate
  // the stored contexts.
  function initContextStack() {
    return {
      _stack: [],

      // Returns the current context, i.e. the one at the top of the stack.
      current() {
        return this._stack[this._stack.length - 1];
      },

      // Push a new template context on the stack. We store the index
      // of the starting token to use it when creating the template token.
      pushNewTemplateContext(startIndex) {
        this._stack.push({ startIndex, isTemplate: true });
      },

      // Push a new non-template context on the stack.
      pushNewNonTemplateContext() {
        this._stack.push({ numBraces: 0, isTemplate: false });
      },

      // Pop the context at the top of the stack, i.e. goes back to the
      // previous context.
      popContext() {
        this._stack.pop();
      },
    };
  }

  // Create a template token to aggregate previous tokens, and returns
  // the new current index.
  function createTemplateTokenAndReturnNewIndex(index) {
    const startIndex = contextStack.current().startIndex;
    replaceWithTemplateType(startIndex, index);
    return startIndex;
  }

  // Return the value as string for tokens from `start` to `end`.
  function getValueForTokens(start, end) {
    const tokenToString = token =>
      token.value || (token.type !== tt.template ? token.type.label : "");
    return tokens.slice(start, end + 1).map(tokenToString).join("");
  }

  // Create a new template token by aggregating tokens from `start` to `end`, and
  // replace the old tokens with the new one.
  function replaceWithTemplateType(start, end) {
    const templateToken = {
      type: "Template",
      value: getValueForTokens(start, end),
      start: tokens[start].start,
      end: tokens[end].end,
      loc: {
        start: tokens[start].loc.start,
        end: tokens[end].loc.end,
      },
    };
    tokens.splice(start, end - start + 1, templateToken);
  }
};
