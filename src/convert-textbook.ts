/**x
 * Convert IBLLinearAlgebra textbook to PreTeXt
 */
import { unified } from "unified";
import fs from "node:fs";
import chalk from "chalk";
import path, { dirname } from "node:path";
import { unifiedLatexFromString } from "@unified-latex/unified-latex-util-parse";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { match } from "@unified-latex/unified-latex-util-match";
import { Root } from "@unified-latex/unified-latex-types";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { pluginParseBookSource } from "./plugin-parse-book-source";
import { parserToConverter } from "./parser-to-converter";
import { pluginMakeBookIntroduction } from "./plugin-make-book-introduction";
import { pluginMakeBookIndex } from "./plugin-make-book-index";

//const origLog = console.log;
//console.log = (...args) => {
//    origLog(...args.map((x) => util.inspect(x, false, 4, true)));
//};

// The script is in the `src` directory. The project root is one level up.
const CWD = path.join(dirname(new URL(import.meta.url).pathname), "..");

/**
 * Convert the book to PreTeXt.
 *
 *  - `source` is the contents of `linearalgebra.tex`
 *  - `defFileContents` is the contents of the `definitions.tex` file
 *  - `moduleFiles` is a an object whose keys are the module file names and whose values are the contents of the module files.
 *
 * @param source
 * @param defFileContents
 * @param moduleFiles
 * @returns
 */
export function convertTextbook(
    source: string,
    defFileContents: string,
    moduleFiles: Record<string, string>
) {
    const output = parserToConverter(
        unified()
            .use(pluginParseBookSource, {
                bookSource: source,
                modulesSource: moduleFiles,
                              onlyProcess: ["appendix3."],
            })
            .use(pluginMakeBookIntroduction, { modulesSource: moduleFiles })
            .use(pluginMakeBookIndex),
        { defFileContents }
    ).processSync(source).value as string;

    return output;
}

async function startConversion(sourceLocation: string) {
    if (!sourceLocation) {
        console.error("Please provide a source file");
        return;
    }
    sourceLocation = path.join(CWD, sourceLocation);
    const definitionsLocation = path.join(
        sourceLocation,
        "..",
        "common",
        "definitions.tex"
    );
    ensureExists(sourceLocation);
    ensureExists(definitionsLocation);
    const defFileContents = fs.readFileSync(definitionsLocation, "utf-8");
    const sourceFileContents = fs.readFileSync(sourceLocation, "utf-8");

    console.log("\nConverting");
    processLog("Entry file:", chalk.green(path.relative(CWD, sourceLocation)));
    processLog(
        "Definitions file:",
        chalk.green(path.relative(CWD, definitionsLocation))
    );

    // Find all the modules listed in the source file
    const moduleContents: Record<string, string> = {};
    let ast = unified().use(unifiedLatexFromString).parse(sourceFileContents);
    const modulesOnlyAst: Root = { type: "root", content: [] };
    visit(ast, (node) => {
        if (
            match.environment(node, "module") ||
            match.environment(node, "appendix")
        ) {
            modulesOnlyAst.content.push(node);
        }
    });
    visit(modulesOnlyAst, (node) => {
        if (match.macro(node, "input")) {
            const args = node.args;
            if (args) {
                const file = printRaw(args[0].content);
                const moduleLocation = path.join(sourceLocation, "..", file);
                ensureExists(moduleLocation);
                processLog(
                    "Found module:",
                    chalk.green(path.relative(CWD, file))
                );
                moduleContents[file] = fs.readFileSync(moduleLocation, "utf-8");
            }
        }
    });

    // Find the files used in the introduction.
    // `modules/preface.tex`
    // `common/contributors.tex`

    const prefaceLocation = path.join(
        sourceLocation,
        "..",
        "modules",
        "preface.tex"
    );
    const contributorsLocation = path.join(
        sourceLocation,
        "..",
        "common",
        "contributors.tex"
    );
    ensureExists(prefaceLocation);
    ensureExists(contributorsLocation);
    processLog(
        "Found preface:",
        chalk.green(path.relative(CWD, prefaceLocation))
    );
    processLog(
        "Found contributors:",
        chalk.green(path.relative(CWD, contributorsLocation))
    );
    moduleContents["modules/preface.tex"] = fs.readFileSync(
        prefaceLocation,
        "utf-8"
    );
    moduleContents["common/contributors.tex"] = fs.readFileSync(
        contributorsLocation,
        "utf-8"
    );

    const converted = convertTextbook(
        sourceFileContents,
        defFileContents,
        moduleContents
    );

    const templateFilePath = path.join(CWD, "pretext-files", "template.ptx");
    let templateSource = "{{BOOK_CONTENT}}";
    try {
        ensureExists(templateFilePath, false);
        templateSource = fs.readFileSync(templateFilePath, "utf-8");
    } catch (e) {
        console.log(
            chalk.red("Template file not found"),
            "using blank template file. Result will not be wrapped in <pretext>...</pretext> tags"
        );
    }

    const bookContent = templateSource.replace("{{BOOK_CONTENT}}", converted);

    const outputPath = path.join(CWD, "tmp.out.ptx");
    console.log();
    processLog("Saving to", chalk.green(path.relative(CWD, outputPath)));
    fs.writeFileSync(outputPath, bookContent, "utf-8");

    return;
}

/**
 * Log a message about processing a file
 */
function processLog(desc: string, value: string) {
    console.log("    ", desc, "\t", chalk.green(value));
}

function ensureExists(path: string, exitOnFail = true) {
    if (!fs.existsSync(path)) {
        console.error("Cannot find source file", path);
        if (exitOnFail) {
            process.exit(1);
        }
        throw new Error(`Cannot find source file ${path}`);
    }
}

function printHelp() {
    console.log("Usage: convert-to-pretext [options]");
    console.log("Options:");
    console.log("  -h, --help     Show this help");
    console.log(
        "  -i             Location of the `linearalgebra.tex` source file"
    );
}

const command = process.argv[2];
const sourceLocation = process.argv[3];

let hasExecuted = false;

if (command === "-i") {
    hasExecuted = true;
    startConversion(sourceLocation);
}

if (command === "-h" || command === "--help" || !hasExecuted) {
    printHelp();
}

// npx vite-node src/convert-to-pretext.ts -f
