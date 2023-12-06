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

const CWD = dirname(new URL(import.meta.url).pathname);

// Read the LaTeX file that contains definitions.
const source = await readFile(
    path.join(CWD, "../book/common/definitions.tex"),
    "utf-8"
);

/**
 * Check if an element is of type "Ast.Environment".
 */
function isEnvironment(elm: any): elm is Ast.Environment {
    return elm && typeof elm === "object" && elm.type === "environment";
}
/**
 * Check if an element is of type "Ast.String".
 */
function isAstString(elm: any): elm is Ast.String {
    return elm && typeof elm === "object" && elm.type === "string";
}
/**
 * Check if an "Ast.Environment" element is a "SavedDefinition" environment.
 */
function isSaveDefinition(elm: Ast.Environment): boolean {
    if (!isEnvironment(elm)) {
        return false;
    }
    if (typeof elm.env != "string") {
        return false;
    }
    return elm.env === "SaveDefinition";
}
/**
 * Check if an "Ast.String" element has the input content.
 */
function hasContent(elm: Ast.String, contentName: string): boolean {
    if (!isAstString(elm)) {
        return false;
    }
    if (typeof elm.content != "string") {
        return false;
    }
    return elm.content === contentName;
}

/**
 * This function finds a defintion in an array that contains defintions given the key name of the definition,
 * and returns the title and contents of the first defintion in the array that matches the key as an Javascript object.
 * Note: If the definition is not found, it will return an Javascript object that has two empty arrays.
 */
function findDefinition(
    definitions: Record<string, Ast.Node[]>[],
    definitionName: string
): Record<string, Ast.Node[]> {
    let title: Ast.Node[] = [];
    let definition: Ast.Node[] = [];

    // Loop through the definnitions array.
    for (let i = 0; i < definitions.length; i++) {
        // If the definition matches, set the title and contents and break out of the loop.
        if (hasContent(definitions[i].key[0] as Ast.String, definitionName)) {
            title = definitions[i].title;
            definition = definitions[i].definition;
            break;
        }
    }

    return { title, definition };
}

/**
 * This plugin visits every node in an AST tree and replaces each '\SavedDefinitionRender{}' macro with the corresponding defintion.
 */
export const replaceDefinitions: Plugin<[], Ast.Root, Ast.Root> =
    function replaceDefinitions() {
        // Parse the definitions into a LaTeX AST.
        const ast = unified()
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
            .processSync(source).result as Ast.Root;

        // Define the definitions array.
        let definitions: Record<string, Ast.Node[]>[] = [];
        // Loop through every node in the LaTeX AST tree.
        for (let i = 0; i < ast.content.length; i++) {
            const node = ast.content[i] as Ast.Environment;
            // Check if the node is a "SaveDefinition" environment with arguments.
            if (isSaveDefinition(node) && node.args != undefined) {
                // Add a new Javascript object to the definitions array with the corresponding key, title and content.
                definitions.push({
                    ...pgfkeysArgToObject(node.args[0]),
                    definition: node.content,
                });
            }
        }
        return function (ast: Ast.Root) {
            // Replace each "SavedDefinitionRender" macro with the definitions that matches the argument of the macro.
            replaceNode(ast, (node) => {
                // Check if the node is a "\SavedDefinitionRender{}" macro with a string argument.
                if (
                    node.type === "macro" &&
                    node.content === "SavedDefinitionRender" &&
                    node.args != undefined &&
                    node.args[0].content[0].type === "string"
                ) {
                    // Find the definition that matches the argument.
                    const definition = findDefinition(
                        definitions,
                        node.args[0].content[0].content
                    );
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
                    });
                }
            });
        };
    };
