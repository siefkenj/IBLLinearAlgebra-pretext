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
import rehypeRemark from "rehype-remark";
import { toString as hastToString } from "hast-util-to-string";
import remarkStringify from "remark-stringify";
// import { visit } from "@unified-latex/unified-latex-util-visit";
import { visit } from 'unist-util-visit';
import * as Hast from "hast";
import * as Ast from "@unified-latex/unified-latex-types";
import { toString } from "@unified-latex/unified-latex-util-to-string";

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

    const output = afterReplacements
        .use(replaceMath)
        .use(rehypeStringify)
        .processSync(value).value;

    return output;
}

function replaceMath() {

    return function (tree) {
      visit(tree, 'element', function (node) {
        if (node.tagName === 'span') {
          node.tagName = 'm'
        }
        
        if (node.tagName === 'div') {
            node.tagName = 'em'
        }
      })
    }
  }

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
