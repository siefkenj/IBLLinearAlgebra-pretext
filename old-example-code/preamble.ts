import * as latexParser from "latex-ast-parser";
import * as fs from "fs";
import * as Ast from "latex-ast-parser/dist/src/libs/ast-types";
const { parse, tools, astParsers, printRaw } = latexParser;

let preambleSrc = fs.readFileSync("../book/common/preamble.tex", "utf8");

let preambleAst: Ast.Ast = parse(preambleSrc);
// Strip comments
preambleAst = tools.ast.deleteComments(preambleAst);

let definedCommands = tools.getNewCommands(preambleAst);
// Do some minor adjusting of the defined commands.

// We want every declared math operator to be saved as a `\operatorname{...}`
// macro so that katex can understand it.
const mathOps = (
    tools.allMacros(preambleAst).get("DeclareMathOperator") || []
).map((op) => [printRaw(op.args![1].content), printRaw(op.args![2].content)]);

const mathOpsRedefinitions = mathOps
    .map(
        ([name, val]) =>
            `\\NewDocumentCommand{${name}}{}{\\operatorname{${val}}}`
    )
    .join("\n");
console.log("Declared math operators", mathOps);

// We want to make a katex-compatible version of DeclarePairedDelimiter
const mathDelims = (
    tools.allMacros(preambleAst).get("DeclarePairedDelimiter") || []
).map((op) => [
    printRaw(op.args![0].content),
    printRaw(op.args![1].content),
    printRaw(op.args![2].content),
]);
const mathDelimsRedefinitions = mathDelims
    .map(
        ([name, left, right]) =>
            `\\NewDocumentCommand{${name}}{s m}{\\@ifstar{
                            \\left${left} #2\\right${right}
                        }{
                            ${left} #2 ${right}
                        }#1 }`
    )
    .join("\n");
console.log("Declared paired delimiter", mathDelims);

let definedCommandsHash = Object.fromEntries(
    definedCommands.map((v) => [v.name, v])
);

// Define a string that has all the newly-defined commands
// in the `NewDocumentCommand` format.
const allDefinedCommandsString =
    String.raw`
\NewDocumentCommand{\given}{}{\::\:}
\NewDocumentCommand{\Set}{s m}{\@ifstar{\left\{#2\right\}}{\{#2\}}#1}
\NewDocumentCommand{\Norm}{s m}{\@ifstar{\left\lVert #2\right\rVert}{\lVert#2\rVert}#1}
%\NewDocumentCommand{\norm}{s m}{\@ifstar{\left\lVert #2\right\rVert}{\lVert#2\rVert}#1}

` +
    mathDelimsRedefinitions +
    mathOpsRedefinitions;
//console.log("inserted defs", allDefinedCommandsString)

const customMacroDefs = tools.getNewCommands(parse(allDefinedCommandsString));
delete definedCommandsHash["#"];
for (const def of customMacroDefs) {
    console.log("adding", def);
    definedCommandsHash[def.name] = def;
}
definedCommands = Object.values(definedCommandsHash);
console.log("Defined Commands:", definedCommands);

// Let's expand the macros used and see if we can't make the output more katex-friendly!
const allDefinedCommandSpecs = definedCommands.filter(
    (command) =>
        Array.isArray(command.substitution) && command.substitution.length > 0
);
const allDefinedCommands = Object.fromEntries(
    allDefinedCommandSpecs.map((command) => [command.name, command])
);

export { allDefinedCommandsString, allDefinedCommandSpecs, allDefinedCommands };
