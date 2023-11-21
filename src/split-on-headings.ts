import { unified } from "unified";
import { rehype } from "rehype";
import rehypeStringify from "rehype-stringify";
import rehypeParse from "rehype-parse";
import rehypeFormat from "rehype-format";
import chalk from "chalk";
import { readFile } from "node:fs/promises";
import path, { dirname } from "node:path";
import {
    parseMath as parse,
    unifiedLatexAstComplier,
} from "@unified-latex/unified-latex-util-parse";
import * as Ast from "@unified-latex/unified-latex-types";
import * as Hast from "hast";

import { visit } from 'unist-util-visit';
import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { unifiedLatexToHast, wrapPars } from "@unified-latex/unified-latex-to-hast";
import { unifiedLatexFromString } from "@unified-latex/unified-latex-util-parse";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";
import { arrayJoin, splitOnMacro } from "@unified-latex/unified-latex-util-split";
import { toString } from "@unified-latex/unified-latex-util-to-string";

const CWD = dirname(new URL(import.meta.url).pathname);

export const convert = (value: string) =>
    
        unified()
            .use(unifiedLatexFromString, {
                macros: {
                    Heading: {
                        signature: "m",
                    },
                },
            })
            .use(unifiedLatexAstComplier)
            .use(function () {
                return (ast: Ast.Root) => {
                    const split = splitOnMacro(ast.content, "Heading");
                    
                    const newHeadings = split.macros.map((heading) => htmlLike({tag: "title", content: heading.args![0].content}))
                    const pars = split.segments.map(seg => wrapPars(seg));
                    let sections: Ast.Root["content"] =[];

                    for (let i = 0; i < newHeadings.length; i++) {
                        
                        let section_content: Ast.Node[] = [newHeadings[i]];
                        for (let j = 0; j < pars[i + 1].length; j++) {
                            section_content.push(pars[i + 1][j])
                        }
                        const section = htmlLike({tag: "section", content: section_content});
                        sections.push(section);
                    }

                    ast.content = sections;


                    //const newContent: Ast.Root["content"] = []
                    
                };
            })
            .use(unifiedLatexToHast)
            .use(rehypeStringify)
            .processSync(value).value;
   

function testConvert() {
    const source = `\\Heading{Sets} \n \\[\\Set{1,2,3}.\\] Hello \\emph{sets} $\\{$`;
    const converted = convert(source);
    


    const formattedPretext = rehype()
        .use(rehypeParse, { fragment: true })
        .use(rehypeFormat)
        .processSync(converted);

    process.stdout.write(
        chalk.green("Converted") +
            "\n\n" +
            source +
            "\n\n" +
            chalk.green("to") +
            "\n\n" +
            formattedPretext +
            "\n"
    );
}

async function testConvertFile() {
    const source = await readFile(
        path.join(CWD, "../book/modules/module1.tex"),
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
