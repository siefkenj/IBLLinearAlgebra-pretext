import { unified, Plugin } from "unified";
import rehypeStringify from "rehype-stringify";
import chalk from "chalk";
import { readFile } from "node:fs/promises";
import path, { dirname } from "node:path";

import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { unifiedLatexToHast } from "@unified-latex/unified-latex-to-hast";
import {
    unifiedLatexAstComplier,
    unifiedLatexFromString,
} from "@unified-latex/unified-latex-util-parse";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";
import { replaceMath } from "./replace-math";
import { splitOnHeadings } from "./split-on-headings";
import { splitOnMacro } from "@unified-latex/unified-latex-util-split";
import { Node } from "@unified-latex/unified-latex-types";
import * as Ast from "@unified-latex/unified-latex-types";

const CWD = dirname(new URL(import.meta.url).pathname);

export function convert(value: string) {
    const addedMacros = unified()
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
                emphbox: {
                    signature: "o m",
                },
            },
        })
        .use(unifiedLatexAstComplier)
        .use(splitOnHeadings);

    const afterReplacements = addedMacros.use(unifiedLatexToHast, {
        macroReplacements: {
            footnote: (node) => {
                const args = getArgsContent(node);
                return htmlLike({
                    tag: "fn",
                    content: args[0] || [],
                });
            },
            index: (node) => {
                const args = getArgsContent(node);
                const formattedArgs = args.flatMap((arg) => {
                    if (arg == null) {
                        return [];
                    } else {
                        return htmlLike({
                            tag: "h",
                            content: arg,
                        });
                    }
                });
                return htmlLike({
                    tag: "idx",
                    content: formattedArgs,
                });
            },
            includegraphics: (node) => {
                const args = getArgsContent(node);
                const path = printRaw(args[args.length - 1] || []).replace(
                    /\.pdf$/,
                    ".png"
                );
                return htmlLike({
                    tag: "img",
                    attributes: { src: path },
                });
            },
            emph: (node) => {
                const args = getArgsContent(node);
                return htmlLike({
                    tag: "em",
                    content: args[0] || [],
                });
            },
        },
        environmentReplacements: {
            example: (node) => {
                let exampleContents = [];
                let solutionContents: Node[] = [];
                let lastParBreak = 0;
                let firstParBreak = 0;
                for (let i = 0; i < node.content.length; i++) {
                    // seperate on parbreaks
                    if (
                        node.content[i].type === "parbreak" ||
                        i === node.content.length - 1
                    ) {
                        let endIndex = i;
                        if (i === node.content.length - 1) {
                            endIndex += 1;
                        }
                        // first paragraph should be wrapped in statement tags
                        if (lastParBreak === 0) {
                            firstParBreak = i;
                            exampleContents.push(
                                htmlLike({
                                    tag: "statement",
                                    content: htmlLike({
                                        tag: "p",
                                        content: node.content.slice(
                                            lastParBreak,
                                            endIndex
                                        ),
                                    }),
                                })
                            );
                        }
                        // the rest are wrapped in solution tags
                        else {
                            solutionContents.push(
                                htmlLike({
                                    tag: "p",
                                    // + 1 to skip the parbreak
                                    content: node.content.slice(
                                        lastParBreak + 1,
                                        endIndex
                                    ),
                                })
                            );
                        }
                        lastParBreak = i;
                    }
                }
                exampleContents.push(
                    htmlLike({
                        tag: "solution",
                        content: solutionContents,
                    })
                );
                return htmlLike({
                    tag: "example",
                    content: exampleContents,
                });
            },
            emphbox: (node) => {
                const args = getArgsContent(node);
                // const formattedArgs = args.flatMap((arg) => {
                //     if (arg == null) {
                //         return [];
                //     } else {
                //         return htmlLike({
                //             tag: "h",
                //             content: arg,
                //         });
                //     }
                // });
                // return htmlLike({
                //     tag: "remark",
                //     content: formattedArgs,
                // });
                console.log(args);
                let remarkContents = [];
                // check if has optional argument for title
                if(args.length === 2 && args[0] !== null) {
                    remarkContents.push(
                        htmlLike({
                            tag: "title",
                            content: args[0]
                        })
                    )
                }
                if(args.length >= 1 && args[args.length - 1] !== null) {
                    remarkContents.push(
                        htmlLike({
                            tag: "p",
                            content: args[args.length - 1] // current issue: args only has the string A and not the full text
                        })
                    )
                }
                return htmlLike({
                    tag: "remark",
                    content: htmlLike({
                        tag: "p",
                        content: remarkContents
                    }),
                });
            },
            "align*": (node) => {
                // function isAstString(elm: any): elm is Ast.String {
                //     return (
                //         elm && typeof elm === "object" && elm.type === "string"
                //     );
                // }
                // function hasContent(node: any, content: string): boolean {
                //     if (!isAstString(node)) {
                //         return false;
                //     }
                //     if (typeof node.content != "string") {
                //         return false;
                //     }
                //     return node.content === content;
                // }
                // for (let i = 0; i < node.content.length; i++) {
                //     if (hasContent(node.content[i], "&")) {
                //         const amp: Ast.String = {
                //             type: "string",
                //             content: "\\amp",
                //         };
                //         node.content[i] = amp;
                //     }
                // }
                const split = splitOnMacro(node.content, "\\");
                const formattedSegments = split.segments.flatMap((segment) => {
                    if (segment == null) {
                        return [];
                    } else {
                        return htmlLike({
                            tag: "mrow",
                            content: segment,
                        });
                    }
                });
                console.log(split);
                return htmlLike({
                    tag: "p",
                    content: htmlLike({
                        tag: "md",
                        content: formattedSegments,
                    }),
                });
            },
        },
    });

    const output = afterReplacements
        .use(replaceMath)
        .use(rehypeStringify)
        .processSync(value).value as string;

    return output;
}

function testConvert() {
    const source = `\\begin{align*} x=m+1&=(2k+1)+1=2k+2\\\\&=2(k+1)=2n,\\end{align*}`;
    const converted = convert(source);
    process.stdout.write(
        chalk.green("Converted") +
            "\n\n" +
            source +
            "\n\n" +
            chalk.green("to") +
            "\n\n" +
            converted +
            "\n"
    );
}

async function testConvertFile() {
    let source = await readFile(
        // path.join(CWD, "../book/modules/module1.tex"),
        path.join(CWD, "../sample-files/small-tex.tex"),
        "utf-8"
    );
    const converted = convert(source);
    process.stdout.write(
        chalk.green("Converted") +
            "\n\n" +
            source +
            "\n\n" +
            chalk.green("to") +
            "\n\n" +
            converted +
            "\n"
    );
}

function printHelp() {
    console.log("Usage: convert-to-pretext [options]");
    console.log("Options:");
    console.log("  -h, --help     Show this help");
    console.log("  -s             Run the converter on a small sample source");
    console.log("  -f             Run the converter on a larger file");
}

const command = process.argv[2];

let hasExecuted = false;

if (command === "-s") {
    hasExecuted = true;
    testConvert();
}
if (command === "-f") {
    hasExecuted = true;
    testConvertFile();
}

if (command === "-h" || command === "--help" || !hasExecuted) {
    printHelp();
}

// npx vite-node src/convert-to-pretext.ts -f


// environments:
// emph box

// Other:
// preserved definition render
