import { unified } from "unified";
import rehypeStringify from "rehype-stringify";
import chalk from "chalk";
import { readFile } from "node:fs/promises";
import path, { dirname } from "node:path";
import { writeFile } from "fs";

import {
    htmlLike,
    isHtmlLike,
} from "@unified-latex/unified-latex-util-html-like";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import {
    unifiedLatexToHast,
    wrapPars,
} from "@unified-latex/unified-latex-to-hast";
import {
    unifiedLatexAstComplier,
    unifiedLatexFromString,
} from "@unified-latex/unified-latex-util-parse";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";
import { replaceMath } from "./plugin-replace-math";
import { splitOnHeadings } from "./plugin-split-on-headings";
import {
    splitOnCondition,
    splitOnMacro,
    unsplitOnMacro,
} from "@unified-latex/unified-latex-util-split";

import { SP, s } from "@unified-latex/unified-latex-builder";
import { Node } from "@unified-latex/unified-latex-types";
import { replaceDefinitions } from "./plugin-replace-definitions";
import { replaceIgnoredElements } from "./plugin-replace-ignored-elements";
import { replaceLabels } from "./plugin-replace-labels";
import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { toString } from "@unified-latex/unified-latex-util-to-string";
import { pgfkeysArgToObject } from "@unified-latex/unified-latex-util-pgfkeys";
import { replaceModules } from "./plugin-replace-modules";
import { replaceIndecesInMathMode } from "./plugin-replace-indeces-in-math-mode";
import { stringifyTikzContent } from "./plugin-stringify-tikz-content";
import { macroInfo, macroReplacements } from "./subs/macro-subs";
import {
    environmentInfo,
    environmentReplacements,
} from "./subs/environment-subs";

const CWD = dirname(new URL(import.meta.url).pathname);

export function convert(value: string, definitionsFile?: string) {
    const addedMacros = unified()
        .use(unifiedLatexFromString, {
            macros: macroInfo,
            environments: environmentInfo,
        })
        .use(unifiedLatexAstComplier)
        .use(splitOnHeadings)
        .use(replaceDefinitions, definitionsFile || "")
        .use(stringifyTikzContent)
        .use(replaceIgnoredElements)
        .use(replaceLabels)
        .use(replaceIndecesInMathMode);

    const afterReplacements = addedMacros.use(unifiedLatexToHast, {
        skipHtmlValidation: true,
        macroReplacements,
        environmentReplacements,
    });

    const output = afterReplacements
        .use(replaceMath)
        .use(rehypeStringify)
        .processSync(value).value as string;

    return output;
}

export function convertTextbook(value: string, definitionsFile?: string) {
    const addedMacros = unified()
        .use(unifiedLatexFromString, {
            macros: macroInfo,
            environments: environmentInfo,
        })
        .use(unifiedLatexAstComplier)
        .use(replaceModules)
        .use(splitOnHeadings)
        .use(replaceDefinitions, definitionsFile || "")
        .use(stringifyTikzContent)
        .use(replaceIgnoredElements)
        .use(replaceLabels)
        .use(replaceIndecesInMathMode);

    const afterReplacements = addedMacros.use(unifiedLatexToHast, {
        skipHtmlValidation: true,
        macroReplacements,
        environmentReplacements,
    });
    const output = afterReplacements
        .use(replaceMath)
        .use(rehypeStringify, { voids: [] })
        .processSync(value).value as string;

    return output;
}

function testConvert() {
    const source = `\\emph{representation of $\\vec v$ in the $\\mathcal B$ basis}`;
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
        path.join(CWD, "../src/small-tex.tex"),

        "utf-8"
    );
    const converted = convertTextbook(source);

    // writeFile("sample-files/converted.xml", converted, (err) => {
    //     if (err) throw err;
    // });

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
