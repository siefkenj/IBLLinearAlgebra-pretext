import { unified } from "unified";
import rehypeStringify from "rehype-stringify";
import chalk from "chalk";
import { readFile } from "node:fs/promises";
import path, { dirname } from "node:path";

import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { unifiedLatexToHast } from "@unified-latex/unified-latex-to-hast";
import { unifiedLatexFromString } from "@unified-latex/unified-latex-util-parse";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";
import {
    replaceNode,
    unifiedLatexReplaceStreamingCommands,
} from "@unified-latex/unified-latex-util-replace";
import rehypeRemark from "rehype-remark";
import { toString as hastToString } from "hast-util-to-string";
import remarkStringify from "remark-stringify";
import { visit } from "@unified-latex/unified-latex-util-visit";
import * as Hast from "hast";
import * as Ast from "@unified-latex/unified-latex-types";
import { toString } from "@unified-latex/unified-latex-util-to-string";
import { mathify } from "./handle-math";

const CWD = dirname(new URL(import.meta.url).pathname);

function convert(value: string) {
    const addedMacros = unified().use(unifiedLatexFromString, {
        macros: {
            Heading: {
                signature: "m",
            },
            footnote: {
                signature: "m",
            },
            index: {
                signature: "m",
            },
        },
    });

    // if needed attach to above 
    // .use(function () {
    //     return (ast: Ast.Root) => {
    //         //hast replace node function
    //         console.log("hi", ast)
    //         replaceNode(ast, (node) => {
    //             if (node.type !== "inlinemath" && node.type !== "displaymath") {
    //                 return
    //             }
    //             // could return html like
    //             if (node.type === "inlinemath") {
    //                 let temp = toString(node.content)
    //                 return htmlLike({
    //                     tag: "m",
    //                     content: [{type: "string", content: toString(node.content)}]
    //                 });
    //             }
    //         })
    //     };
    // })

    const afterReplacements = addedMacros.use(unifiedLatexToHast, {
        macroReplacements: {
            Heading: (node) => {
                const args = getArgsContent(node);
                return htmlLike({
                    tag: "title",
                    content: args[0] || [],
                });
            },
            footnote: (node) => {
                const args = getArgsContent(node);
                return htmlLike({
                    tag: "fn",
                    content: args[0] || [],
                });
            },
            index: (node) => {
                const args = getArgsContent(node);
                return htmlLike({
                    tag: "idx",
                    content: htmlLike({
                        tag: "h",
                        content: args[0] || [],
                    }),
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
        },
    });
    // console.log('point 1');
    // const processedMath = afterReplacements.use(rehypeRemark, {
    //     handlers: {
    //         div(state, node, parent) {
    //             const className = (node.properties.className ||
    //                 []) as string[];
    //             if (className.includes("inline-math")) {
    //                 console.log('point 2');
    //                 return {
    //                     type: "html",
    //                     value: `$${hastToString(node)}$`,
    //                 };
    //             }
    //             return state.all(node);
    //         },

    //     }
    // })

    // const afterReplacements
    // function replaceMath(node) {
    //     if (node.type === "inlinemath") {
    //         return htmlLike({
    //             tag: "m",
    //             content: node.content,
    //         })
    //     }
    //     // return (tree) => {
    //     //     let index = 0;
    //     //     replaceNode(tree, (node) => {
    //     //         console.log(node.type);
    //     //         if (node.type === "inlinemath") {
    //     //             return htmlLike({
    //     //                 tag: "m",
    //     //                 content: node.content,
    //     //             })
    //     //         }
    //     //     });
    //     // };
    //     return;
    // }
    // let copy = afterReplacements;
    // copy.processSync(value);

    // replaceNode(copy.processSync(), (node) => {
    // replaceNode(copy, (node) => {
    //     console.log(node.type);
    //     if (node.type === "inlinemath") {
    //         return htmlLike({
    //             tag: "m",
    //             content: node.content,
    //         })
    //     }
    // });

    // processedMath.use(remarkStringify).processSync(value).value;
    const output = afterReplacements
        .use(mathify())
        .use(rehypeStringify)
        .processSync(value).value;
            // return (hast: Hast.Root) => {
                // console.log("afterReplacements", hast);
                // console.log("properties2", node.tag)
                // replaceNode(hast, (node) => {
                // if (node.type !== "inlinemath" && node.type !== "displaymath") {
                //     return
                // }
                // if (node.type === "inlinemath") {
                //     let temp = toString(node.content)
                //     // return htmlLike({
                //     //     tag: "m",
                //     //     content: [{type: "string", content: toString(node.content)}]
                //     // });
                //     return 
                // }
            // } )
        //         //hast replace node function
        //         // TODO: better to convert math down here rather than in ast
                
        //         //install vitest in the repo for unit test'//test files should look like unified latex tests
        //         //make branch, make pull request, do code review 
            // };
        
    
    // .use(function () {
    //     return (ast: Ast.Root) => {
    //         //hast replace node function
    //         console.log("hi", ast)
    //         replaceNode(ast, (node) => {
    //             if (node.type !== "inlinemath" && node.type !== "displaymath") {
    //                 return
    //             }
    //             // could return html like
    //             if (node.type === "inlinemath") {
    //                 let temp = toString(node.content)
    //                 return htmlLike({
    //                     tag: "m",
    //                     content: [{type: "string", content: toString(node.content)}]
    //                 });
    //             }
    //         })
    //     };
    // })

    // const mathed = unified().use(unifiedLatexFromString)
    return output;
    // return testOut.use(rehypeStringify).processSync(value).value;
}

// const convert2 = (value: string) =>

function testConvert() {
    const source = `\\includegraphics{foo.pdf}\\Heading{Sets}`;
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
    const source = await readFile(
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
// Left:
// In-line math, display math
// SavedDefinitionRender
// Titles for examples
// Square bracket notation in index? \index[symbols]{$\notin$}
// paragraphs
