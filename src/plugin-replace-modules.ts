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

const CWD = dirname(new URL(import.meta.url).pathname);

// const linearalgebraFile = await readFile(
//     path.join(CWD, "../book/linearalgebra.tex"),
//     "utf-8"
// );

export const replaceModules: Plugin<[], Ast.Root, Ast.Root> =
    function replaceModules() {
        // const linearalgebra = unified()
        //     .use(unifiedLatexFromString, {
        //         macros: {
        //             input: {
        //                 signature: "m",
        //             },
        //         },
        //     })
        //     .use(unifiedLatexAstComplier)
        //     .processSync(linearalgebraFile).result as Ast.Root;

        let modules = new Map<string, Ast.Root>();

        readdirSync("book/modules").forEach((file) => {
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
                .use(replaceIgnoredElements)
                .use(replaceLabels)
                .processSync(
                    readFileSync("book/modules/" + file, { encoding: "utf8" })
                ).result as Ast.Root;

            modules.set("modules/" + file, module);
        });

        return function (ast: Ast.Root) {
            replaceNode(ast, (node) => {
                if (match.macro(node, "input")) {
                    const file = toString(
                        (getArgsContent(node) as Ast.Node[][])[0]
                    );

                    return modules.get(file)?.content;
                }
            });
        };
    };
