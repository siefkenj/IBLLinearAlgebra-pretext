import path, { dirname } from "node:path";
import { readdirSync, readFileSync } from "fs";

import * as Ast from "@unified-latex/unified-latex-types";
import {
    unifiedLatexAstComplier,
    unifiedLatexFromString,
} from "@unified-latex/unified-latex-util-parse";
import { wrapPars } from "@unified-latex/unified-latex-to-hast";
import { unified, Plugin } from "unified";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";
import { match } from "@unified-latex/unified-latex-util-match";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";
import { toString } from "@unified-latex/unified-latex-util-to-string";
import { splitOnHeadings } from "./plugin-split-on-headings";
import { macroInfo } from "./subs/macro-subs";
import { environmentInfo } from "./subs/environment-subs";

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
                    macros: macroInfo,
                    environments: environmentInfo,
                })
                .use(unifiedLatexAstComplier)
                .use(splitOnHeadings)
                // .use(replaceDefinitions)
                // .use(stringifyTikzContent)
                // .use(replaceIgnoredElements)
                // .use(replaceLabels)
                // .use(replaceIndecesInMathMode)
                .processSync(
                    readFileSync("book/modules/" + file, { encoding: "utf8" })
                ).result as Ast.Root;
            // Set a key and value pair in the map
            if (file === "preface.tex") {
                module.content = wrapPars(module.content);
            }
            modules.set("modules/" + file, module);
        });

        const contributors = unified()
            .use(unifiedLatexFromString, {
                macros: macroInfo,
                environments: environmentInfo,
            })
            .use(unifiedLatexAstComplier)
            .use(splitOnHeadings)
            // .use(replaceDefinitions)
            // .use(stringifyTikzContent)
            // .use(replaceIgnoredElements)
            // .use(replaceLabels)
            // .use(replaceIndecesInMathMode)
            .processSync(
                readFileSync("book/common/contributors.tex", {
                    encoding: "utf8",
                })
            ).result as Ast.Root;

        contributors.content.forEach((node) => {
            if (match.environment(node, "quote")) {
                node.env = "center";
                node.content = wrapPars(node.content);
            }
        });
        contributors.content = wrapPars(contributors.content);
        modules.set("common/contributors.tex", contributors);

        return function (ast: Ast.Root) {
            replaceNode(ast, (node) => {
                // Check if the node is a "\input{}" macro.
                if (match.macro(node, "input")) {
                    // Get the argument of the node which is the name of the file.
                    const file = toString(
                        (getArgsContent(node) as Ast.Node[][])[0]
                    );

                    // Check if the file is a module
                    if (
                        file.includes("modules") ||
                        file == "common/contributors.tex"
                    ) {
                        // Used the file name to replace the node with the corresponding LaTeX AST.
                        return modules.get(file)?.content;
                    }

                    // Otherwise remove input
                    return null;
                }
            });
        };
    };
