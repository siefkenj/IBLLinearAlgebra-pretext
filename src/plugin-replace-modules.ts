import path, { dirname } from "node:path";
import { readdirSync, readFileSync } from "fs";

import * as Ast from "@unified-latex/unified-latex-types";
import {
    unifiedLatexAstComplier,
    unifiedLatexFromString,
} from "@unified-latex/unified-latex-util-parse";
import { replaceDefinitions } from "./plugin-replace-definitions";
import { replaceIgnoredElements } from "./plugin-replace-ignored-elements";
import { replaceLabels } from "./plugin-replace-labels";
import { unified, Plugin } from "unified";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";
import { match } from "@unified-latex/unified-latex-util-match";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";
import { toString } from "@unified-latex/unified-latex-util-to-string";
import { splitOnHeadings } from "./plugin-split-on-headings";
import { replaceIndecesInMathMode } from "./plugin-replace-indeces-in-math-mode";
import { stringifyTikzContent } from "./plugin-stringify-tikz-content";

const CWD = dirname(new URL(import.meta.url).pathname);

/**
 * Plugin for replacing "\input{}" macros with the LaTeX AST of the corresponding module.
 *
 */

export const replaceModules: Plugin<[], Ast.Root, Ast.Root> =
    function replaceModules() {
        // Create a map with the file as the key, and the AST tree of the corresponding modules as the value.
        let modules = new Map<string, Ast.Root>();

        // Read every file in "book/modules" directory.
        readdirSync("book/modules").forEach((file) => {
            // Parse module into LaTeX AST
            const module = unified()
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
                        SavedDefinitionRender: {
                            signature: "m",
                        },
                        ref: {
                            signature: "m",
                        },
                        eqref: {
                            signature: "m",
                        },
                        label: {
                            signature: "m",
                        },
                        prob: {
                            signature: "o",
                        },
                        hefferon: {
                            signature: "o",
                        },
                    },
                    environments: {
                        emphbox: {
                            signature: "o m",
                        },
                        definition: {
                            signature: "o",
                        },
                        theorem: {
                            signature: "o",
                        },
                        tabular: {
                            signature: "m",
                        },
                        equation: {
                            renderInfo: {
                                inMathMode: true,
                            },
                        },
                    },
                })
                .use(unifiedLatexAstComplier)
                .use(splitOnHeadings)
                .use(replaceDefinitions)
                .use(stringifyTikzContent)
                .use(replaceIgnoredElements)
                .use(replaceLabels)
                .use(replaceIndecesInMathMode)
                .processSync(
                    readFileSync("book/modules/" + file, { encoding: "utf8" })
                ).result as Ast.Root;
            // Set a key and value pair in the map
            modules.set("modules/" + file, module);
        });

        return function (ast: Ast.Root) {
            replaceNode(ast, (node) => {
                // Check if the node is a "\input{}" macro.
                if (match.macro(node, "input")) {
                    // Get the argument of the node which is the name of the file.
                    const file = toString(
                        (getArgsContent(node) as Ast.Node[][])[0]
                    );
                    // Used the file name to replace the node with the corresponding LaTeX AST.
                    return modules.get(file);
                }
            });
        };
    };
