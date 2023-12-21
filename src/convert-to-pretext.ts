import { unified } from "unified";
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
import { replaceMath } from "./plugin-replace-math";
import { splitOnHeadings } from "./plugin-split-on-headings";
import { splitOnMacro } from "@unified-latex/unified-latex-util-split";
import { replaceDefinitions } from "./plugin-replace-definitions";

const CWD = dirname(new URL(import.meta.url).pathname);

export function convert(value: string, definitionsFile?: string) {
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
                SavedDefinitionRender: {
                    signature: "m",
                },
            },
        })
        .use(unifiedLatexAstComplier)
        .use(splitOnHeadings)
        .use(replaceDefinitions, definitionsFile || "");

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
            // SavedDefinitionRender: (node) => {
            //     const definition = findDefinition(
            //         node.args[0].content[0].content
            //     );
            //     const title = htmlLike({
            //         tag: "title",
            //         content: definition.title,
            //     });
            //     const statement = htmlLike({
            //         tag: "statement",
            //         content: definition.definition,
            //     });
            //     return htmlLike({
            //         tag: "definition",
            //         content: [title, statement],
            //     });
            // },
        },
        environmentReplacements: {
            example: (node) => {
                return htmlLike({
                    tag: "example",
                    content: htmlLike({
                        tag: "statement",
                        content: node.content,
                    }),
                });
            },
            emphbox: (node) => {
                return htmlLike({
                    tag: "remark",
                    content: htmlLike({
                        tag: "p",
                        content: node.content,
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
    const source = `\\SavedDefinitionRender{UnionsIntersections}`;
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

// macros:
// hspace
// square brackets on index tag

// environments:
// emph box
// align

// Other:
// wrap <me> tags with <p> tags
// preserve & in the align environment (and other places) since the & converts into different characters in html
// p tags
// preserved definition render
