"use strict";

module.exports = function(tokens, tt) {
  // As long as we will iterate through the tokens array, we'll maintain a stack of
  // contexts. This stack will alternate with:
  //   * template context (for strings): they have `isTemplate` set to `true`, and
  //     keep in `index` property the index of the token (in the array) that started
  //     the template;
  //   * non-template contexts (for JavaScript code): they have `isTemplate` set to
  //     `false`, and keep a number of opened braces ('{', i.e. the ones that were
  //     not closed with '}').
  // The top (i.e. last) context in the stack is the current one.
  const contextStack = [];

  // At the beginning, we are not in a template.
  pushNewNonTemplateContext();

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];

    if (currentContext().inTemplate) {
      // We are in a template…

      // If we encounter a '${' or a '`', we go out of template (string) mode and create
      // a template token. But the behavior differs depending on '${' or '`'…
      if (token.type === tt.dollarBraceL) {
        // If '${', then we begin a new expression with its own context. This means that
        // we add a new context to the stack, and define it as the current context.
        index = createTemplateTokenAndReturnNewIndex(index, token);
        pushNewNonTemplateContext();
      } else if (token.type === tt.backQuote) {
        // If '`', then we go back to the previous expression (the one before the template
        // string began). We restore the previous context, with its numOfBraces.
        index = createTemplateTokenAndReturnNewIndex(index, token);
        popContext();
      }

      // If not a '${' or a '`', we just keep going.
    } else {
      // We are out of a template…

      // If we encounter a '`' or a '}' (and there is no not-closed '{'), we go in template
      // (string) mode. Again two cases to handle:
      if (token.type === tt.backQuote) {
        // If '`', we begin a new template string, so we add a new context to the stack, and
        // set it as the current context.
        pushNewTemplateContext(index);
      } else if (currentContext().numBraces === 0 && token.type === tt.braceR) {
        // If '}', then we go back to the previous template string (that was "interrupted" by
        // an embedded expression '${...}'), so we go back to the previous context.
        popContext();
        currentContext().startIndex = index;
        // Note that `contextStack[contextIndex].isTemplate` is already `true`.
      } else if (token.type === tt.braceL) {
        // In the case we encounter a '{', we increment the current number of openened braces.
        currentContext().numBraces++;
      } else if (token.type === tt.braceR) {
        // And if '}' (and it's not been identified as the end of an embedded expression), we
        // decrement the current number of opened braces.
        currentContext().numBraces--;
      }
    }
  }

  function createTemplateTokenAndReturnNewIndex(index, token) {
    const { startIndex } = currentContext();
    replaceWithTemplateType(startIndex, index);
    return startIndex;
  }

  function currentContext() {
    return contextStack[contextStack.length - 1];
  }

  function pushNewTemplateContext(startIndex) {
    contextStack.push({ startIndex, inTemplate: true });
  }

  function pushNewNonTemplateContext() {
    contextStack.push({ numBraces: 0, inTemplate: false });
  }

  function popContext() {
    contextStack.pop();
  }

  // append the values between start and end
  function createTemplateValue(start, end) {
    var value = "";
    while (start <= end) {
      if (tokens[start].value) {
        value += tokens[start].value;
      } else if (tokens[start].type !== tt.template) {
        value += tokens[start].type.label;
      }
      start++;
    }
    return value;
  }

  // create Template token
  function replaceWithTemplateType(start, end) {
    var templateToken = {
      type: "Template",
      value: createTemplateValue(start, end),
      start: tokens[start].start,
      end: tokens[end].end,
      loc: {
        start: tokens[start].loc.start,
        end: tokens[end].loc.end,
      },
    };

    // put new token in place of old tokens
    tokens.splice(start, end - start + 1, templateToken);
  }
};
