/**
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
import { pluginParseBookSource } from "./plugins/plugin-parse-book-source";
import { parserToConverter } from "./plugins/parser-to-converter";
import { pluginMakeBookIntroduction } from "./plugins/plugin-make-book-introduction";
import { pluginMakeBookIndex } from "./plugins/plugin-make-book-index";

//const origLog = console.log;
//console.log = (...args) => {
//    origLog(...args.map((x) => util.inspect(x, false, 4, true)));
//};

// The script is in the `src` directory. The project root is one level up.
const CWD = path.join(dirname(new URL(import.meta.url).pathname), "..");

/**
 * A module may carry a block of tikz definitions that its figures are drawn
 * with. Pretext compiles every `latex-image` on its own, so those definitions
 * have to travel to the `latex-image-preamble` in the template rather than
 * stay in the body, where they would only be rendered as stray text.
 *
 * The block is delimited in the LaTeX source by
 *
 *     %%% BEGIN LATEX-IMAGE PREAMBLE
 *     ...
 *     %%% END LATEX-IMAGE PREAMBLE
 */
const LATEX_IMAGE_PREAMBLE_BLOCK =
    /^[ \t]*%%%[ \t]*BEGIN LATEX-IMAGE PREAMBLE[ \t]*$([\s\S]*?)^[ \t]*%%%[ \t]*END LATEX-IMAGE PREAMBLE[ \t]*$/m;

/**
 * Cut any latex-image preamble block out of `source`, returning the remaining
 * source along with the blocks that were removed.
 */
export function extractLatexImagePreamble(source: string): {
    source: string;
    preamble: string;
} {
    let preamble = "";
    let remaining = source;
    let matched = remaining.match(LATEX_IMAGE_PREAMBLE_BLOCK);
    while (matched) {
        preamble += matched[1];
        remaining = remaining.replace(LATEX_IMAGE_PREAMBLE_BLOCK, "");
        matched = remaining.match(LATEX_IMAGE_PREAMBLE_BLOCK);
    }
    return { source: remaining, preamble };
}

/**
 * The preamble is dropped into an XML document, so the characters XML reserves
 * have to be escaped. `->` in a tikz option list makes this more than a
 * theoretical concern.
 */
function escapeXml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

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
                // onlyProcess: ["module5."],
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
    let latexImagePreamble = "";
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
                const extracted = extractLatexImagePreamble(
                    fs.readFileSync(moduleLocation, "utf-8")
                );
                if (extracted.preamble) {
                    processLog(
                        "  latex-image preamble from:",
                        chalk.green(path.relative(CWD, file))
                    );
                    latexImagePreamble += extracted.preamble;
                }
                moduleContents[file] = extracted.source;
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

    const bookContent = templateSource
        .replace("{{BOOK_CONTENT}}", converted)
        .replace(
            "{{LATEX_IMAGE_PREAMBLE}}",
            escapeXml(latexImagePreamble)
        );

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
