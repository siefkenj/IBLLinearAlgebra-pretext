import { readFile } from "node:fs/promises";
import path, { dirname } from "node:path";

import { unified, Plugin } from "unified";
import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import {
    unifiedLatexAstComplier,
    unifiedLatexFromString,
} from "@unified-latex/unified-latex-util-parse";
import { pgfkeysArgToObject } from "@unified-latex/unified-latex-util-pgfkeys";
import * as Ast from "@unified-latex/unified-latex-types";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";
import { wrapPars } from "@unified-latex/unified-latex-to-hast";
import { toString } from "@unified-latex/unified-latex-util-to-string";
import { match } from "@unified-latex/unified-latex-util-match";

const CWD = dirname(new URL(import.meta.url).pathname);

// Read the LaTeX file that contains definitions.
const definitionsFile = await readFile(
    path.join(CWD, "../book/common/definitions.tex"),
    "utf-8"
);

/**
 * This plugin visits every node in an AST tree and replaces each '\SavedDefinitionRender{}' macro with the corresponding defintion.
 */
export const replaceDefinitions: Plugin<string[], Ast.Root, Ast.Root> =
    function replaceDefinitions(file) {
        // Parse the definitions into a LaTeX AST.
        const definitionsAst = unified()
            .use(unifiedLatexFromString, {
                macros: {
                    Heading: {
                        signature: "m",
                    },
                    footnote: {
                        signature: "m",
                    },
                    index: {
                        signature: "o m",
                    },
                },
                environments: {
                    SaveDefinition: {
                        signature: "o",
                    },
                },
            })
            .use(unifiedLatexAstComplier)
            .processSync(file || definitionsFile).result as Ast.Root;

        // Define the definitions map.
        let definitions = new Map<string, Record<string, Ast.Node[]>>();
        // Loop through every node in the LaTeX AST tree.
        for (let definition of definitionsAst.content) {
            // Check if the node is a "SaveDefinition" environment with arguments.
            if (
                match.environment(definition, "SaveDefinition") &&
                definition.args != undefined
            ) {
                // Add a new Javascript object to the definitions map with the corresponding key, title and content.
                const pgfkeysObject = pgfkeysArgToObject(definition.args[0]);
                definitions.set(toString(pgfkeysObject.key[0]), {
                    title: pgfkeysObject.title,
                    definition: definition.content,
                });
            }
        }
        return function (ast: Ast.Root) {
            // Replace each "SavedDefinitionRender" macro with the definitions that matches the argument of the macro.
            replaceNode(ast, (node) => {
                // Check if the node is a "\SavedDefinitionRender{}" macro with a string argument.
                if (
                    match.macro(node, "SavedDefinitionRender") &&
                    node.args != undefined
                ) {
                    // Find the definition that matches the argument.
                    const definition = definitions.get(
                        toString(node.args[0].content[0])
                    );
                    if (definition != undefined) {
                        // Wrap the title in '\html-tag:title{...}' macros.
                        const title = htmlLike({
                            tag: "title",
                            content: definition.title,
                        });
                        // Wrap the contents of the definition in \html-tag:statement{...}' macros.
                        const statement = htmlLike({
                            tag: "statement",
                            content: wrapPars(definition.definition),
                        });
                        // Wrap everything in \html-tag:definition{...}' in macros and replace the node.
                        return htmlLike({
                            tag: "definition",
                            content: [title, statement],
                            attributes: {
                                "xml:id": toString(node.args[0].content[0]),
                            },
                        });
                    }
                }
            });
        };
    };
