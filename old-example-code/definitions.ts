import * as latexParser from "latex-ast-parser";
import * as fs from "fs";
import * as Ast from "latex-ast-parser/dist/src/libs/ast-types";
import { allDefinedCommands } from "./preamble";
const { parse, tools, astParsers, printRaw } = latexParser;
const { wrapPars } = tools.html;

let definitionsSrc = fs.readFileSync("../book/common/definitions.tex", "utf8");

const environments = {
    SaveDefinition: { signature: "o", renderInfo: { pgfkeysArgs: true } },
};
const macros = {
    index: { signature: "o m" },
    ...allDefinedCommands,
};

let definitionsAst: Ast.Ast = parse(definitionsSrc, { environments, macros });
// Strip comments
definitionsAst = tools.ast.deleteComments(definitionsAst);

/**
 * Map from `SavedDefinition` keys to the Ast nodes.
 */
const savedDefinitions: Record<string, Ast.Node> = {};

// Replace environments with html wrappers
const envReplacements: Record<string, (node: Ast.Environment) => Ast.Node> = {
    SaveDefinition: (node: Ast.Environment) => {
        // Parsed args has a `key` and `title` attribute, each of which
        // contains an array of nodes.
        const args = tools.argContentsFromMacro(node);
        const parsedArgs = tools.pgfkeysArgToObject(args[0] || []);

        const body = tools.tagLikeMacro({
            tag: "div",
            attributes: { class: "def-body" },
            content: wrapPars(node.content),
        });
        const title = tools.tagLikeMacro({
            tag: "div",
            attributes: { class: "def-title" },
            content: parsedArgs.title,
        });
        const ret = tools.tagLikeMacro({
            tag: "div",
            attributes: { class: "def", id: printRaw(parsedArgs.key) },
            content: [title, body],
        });

        // Save the definition for later reuse
        savedDefinitions[printRaw(parsedArgs.key)] = ret;

        return ret;
    },
};

definitionsAst = tools.ast.replaceNode(
    definitionsAst,
    (node: Ast.Node) => {
        if (!tools.match.environment(node)) {
            return node;
        }
        let ret: Ast.Node = node;
        const envName = printRaw(node.env);
        const replacementFunc = envReplacements[envName];
        if (replacementFunc) {
            ret = replacementFunc(node);
        }
        return ret;
    },
    (node) =>
        tools.match.environment(node) &&
        Object.keys(envReplacements).some((name) =>
            tools.match.environment(node, name)
        )
);

console.log("SavedDefinitions", savedDefinitions);

export function expandSavedDefinitions(ast: Ast.Ast): Ast.Ast {
    return tools.ast.replaceNode(
        ast,
        (node) => {
            if (!tools.match.macro(node)) {
                return node;
            }
            const args = tools.argContentsFromMacro(node);
            const definitionKey = printRaw(args[0] || []);
            if (savedDefinitions[definitionKey]) {
                return savedDefinitions[definitionKey];
            }
            console.warn(
                "Cannot find saved definition",
                definitionKey,
                "in node",
                node
            );
            return node;
        },
        (node) => tools.match.macro(node, "SavedDefinitionRender")
    );
}

export { savedDefinitions };
