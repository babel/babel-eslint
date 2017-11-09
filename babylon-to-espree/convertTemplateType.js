"use strict";

module.exports = function(tokens, tt) {
  const contextStack = [{ inTemplate: false, numBraces: 0 }];
  let contextIndex = 0;
  const getContext = () => contextStack[contextIndex];

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    const context = getContext();

    if (context.inTemplate) {
      // We are in a template…
      const isTemplateEnder =
        token.type === tt.dollarBraceL || token.type === tt.backQuote;
      if (isTemplateEnder) {
        if (token.type === tt.dollarBraceL) {
          contextIndex++;
          if (!contextStack[contextIndex]) {
            contextStack[contextIndex] = { numBraces: 0, inTemplate: false };
          }
        } else {
          contextIndex--;
        }

        // We have a complete template token :)
        const { index: startIndex } = context;
        replaceWithTemplateType(startIndex, index);
        index = startIndex;
      }
    } else {
      // We are out of a template…
      const isTemplateStarter =
        token.type === tt.backQuote ||
        (context.numBraces === 0 && token.type === tt.braceR);

      if (isTemplateStarter) {
        if (token.type === tt.backQuote) {
          contextIndex++;
          contextStack[contextIndex] = { index, inTemplate: true };
        } else {
          contextIndex--;
        }
        contextStack[contextIndex].index = index;
      } else if (token.type === tt.braceL) {
        context.numBraces++;
      } else if (token.type === tt.braceR) {
        context.numBraces--;
      }
    }
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
