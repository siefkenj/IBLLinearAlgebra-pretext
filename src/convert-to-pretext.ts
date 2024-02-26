import { unified } from "unified";
import rehypeStringify from "rehype-stringify";
import chalk from "chalk";
import { readFile } from "node:fs/promises";
import path, { dirname } from "node:path";
import { writeFile } from "fs";
import { unifiedLatexToHast } from "@unified-latex/unified-latex-to-hast";
import {
    unifiedLatexAstComplier,
    unifiedLatexFromString,
    unifiedLatexFromStringMinimal,
} from "@unified-latex/unified-latex-util-parse";
import { replaceMath } from "./plugin-replace-math";

import { replaceDefinitions } from "./plugin-replace-definitions";
import { replaceIgnoredElements } from "./plugin-replace-ignored-elements";
import { replaceLabels } from "./plugin-replace-labels";
import { replaceModules } from "./plugin-replace-modules";
import { replaceIndicesInMathMode } from "./plugin-replace-indices-in-math-mode";
import { stringifyTikzContent } from "./plugin-stringify-tikz-content";
import { removeIgnoredTags } from "./plugin-remove-ignored-tags";
import { replaceSetStar } from "./plugin-replace-set-star";
import { parseLinearalgebra } from "./plugin-parse-linearalgebra";
import { macroInfo, macroReplacements } from "./subs/macro-subs";
import {
    environmentInfo,
    environmentReplacements,
} from "./subs/environment-subs";
import { parserToConverter } from "./parser-to-converter";

const CWD = dirname(new URL(import.meta.url).pathname);

export function convert(value: string, definitionsFile?: string) {
    const output = parserToConverter(
        unified().use(unifiedLatexFromStringMinimal),
        { defFileContents: definitionsFile || "" }
    ).processSync(value).value as string;

    return output;
}

export const convertTextbook = convert;

function testConvert() {
    const source = `\\subsection*{About this Book}`;
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
        // path.join(CWD, "../src/textbook.tex"),
        // path.join(CWD, "../book/modules/module3.tex"),
        path.join(CWD, "../book/linearalgebra.tex"),

        "utf-8"
    );
    // const converted = convertTextbook(source);
    const converted = convertTextbook(source);

    // writeFile("sample-files/converted.xml", converted, (err) => {
    //     if (err) throw err;
    // });

    writeFile("src/sample.xml", converted, (err) => {
        if (err) throw err;
    });

    // process.stdout.write(
    //     chalk.green("Converted") +
    //         "\n\n" +
    //         source +
    //         "\n\n" +
    //         chalk.green("to") +
    //         "\n\n" +
    //         converted +
    //         "\n"
    // );
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
