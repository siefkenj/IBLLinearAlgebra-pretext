import * as latexParser from "latex-ast-parser";
import * as fs from "fs";
import { basename } from "path";
import * as Ast from "latex-ast-parser/dist/src/libs/ast-types";
import { allDefinedCommands, allDefinedCommandSpecs } from "./preamble";
import {
    bookEnvironments,
    bookMacros,
    expandBookEnvironments,
    expandBookMacros,
} from "./book-commands";
import { expandSavedDefinitions } from "./definitions";
import { renderFigure } from "./tikz";
const { parse, tools, astParsers, printRaw } = latexParser;
const { wrapPars } = tools.html;
const { walkAst, argContentsFromMacro } = tools;

let bookSrc = fs.readFileSync("../book/linearalgebra-book.tex", "utf8");

const environments = {
    SaveDefinition: { signature: "o", renderInfo: { pgfkeysArgs: true } },
};
const macros = {
    index: { signature: "o m" },
    include: { signature: "m" },
    Title: { signature: "m" },
    ...allDefinedCommands,
};

let bookAst: Ast.Ast = parse(bookSrc, { environments, macros });
// Strip comments
bookAst = tools.ast.deleteComments(bookAst);

const allModules = tools.allEnvironments(bookAst).get("module") || [];
const allAppendices = tools.allEnvironments(bookAst).get("appendix") || [];

interface ModuleInfo {
    title: Ast.Node[];
    linkedFiles: string[];
    label?: string | null;
    introContent: Ast.Node[];
}

/**
 * Process the content of the module environment and extract the important bits.
 */
function processModuleEnvironment(env: Ast.Environment) {
    const ret: ModuleInfo = {
        title: [],
        linkedFiles: [],
        introContent: [],
    };
    let moduleContent = [...env.content];

    // Grab the title and filter it out
    moduleContent = tools.ast.replaceNode(
        moduleContent,
        (node) => {
            if (!tools.match.macro(node)) {
                return node;
            }
            const args = tools.argContentsFromMacro(node);
            ret.title = args[0] || [];
            return null;
        },
        (node) => tools.match.macro(node, "Title")
    ) as Ast.Node[];

    // Grab any label and filter it out
    moduleContent = tools.ast.replaceNode(
        moduleContent,
        (node) => {
            if (!tools.match.macro(node)) {
                return node;
            }
            const args = tools.argContentsFromMacro(node);
            ret.label = printRaw(args[0] || []);
            return null;
        },
        (node) => tools.match.macro(node, "label")
    ) as Ast.Node[];

    // Grab the linked files
    moduleContent = tools.ast.replaceNode(
        moduleContent,
        (node) => {
            if (!tools.match.macro(node)) {
                return node;
            }
            const args = tools.argContentsFromMacro(node);
            ret.linkedFiles.push(printRaw(args[0] || []));
            return null;
        },
        (node) => tools.match.macro(node, "input")
    ) as Ast.Node[];

    ret.introContent = moduleContent;
    return ret;
}

/**
 * Process a file's contents and render its tikz figures. A list of the figure files
 * is returned, but they are not copied anywhere and the tikz environments are not replaced.
 */
export function processFile(src: string) {
    let moduleAst: Ast.Ast = parse(src, {
        macros: {
            ...allDefinedCommands,
            ...bookMacros,
            index: { signature: "o m" },
        },
        environments: bookEnvironments,
    });
    console.log("processed", moduleAst);
    // Strip comments
    moduleAst = tools.ast.deleteComments(moduleAst);

    moduleAst = tools.fixAllLints(moduleAst);

    // Extract the headings and subsections
    const allMacros = tools.allMacros(moduleAst);
    const headings = (allMacros.get("Heading") || []).map((macro) => {
        const args = argContentsFromMacro(macro);
        return args[0] || [];
    });

    (moduleAst as any).content = tools.html.wrapPars(
        (moduleAst as any).content,
        {
            macrosThatBreakPars: [
                "Heading",
                "SavedDefinitionRender",
                "part",
                "chapter",
                "section",
                "subsection",
                "subsubsection",
                "vspace",
            ],
        }
    );

    moduleAst = expandSavedDefinitions(moduleAst);

    // Extract the tikz figures
    const tikzFigures: Ast.Node[] = [];
    walkAst(
        moduleAst,
        (node) => {
            tikzFigures.push(node);
            return node;
        },
        ((node) =>
            tools.match.environment(
                node,
                "tikzpicture"
            )) as Ast.TypeGuard<Ast.Environment>
    );

    moduleAst = expandBookMacros(moduleAst);
    moduleAst = expandBookEnvironments(moduleAst);

    moduleAst = tools.expandMacros(moduleAst, allDefinedCommandSpecs);
    moduleAst = tools.convertToHtml(moduleAst);

    moduleAst = tools.expandMacros(moduleAst, [
        { name: "index", substitution: [] },
        { name: "footnote", substitution: [] },
    ]);

    // Render all the figures
    console.log("Found tikz figures", tikzFigures);
    const figureFiles: string[] = [];
    for (const figure of tikzFigures) {
        let file = "templates/could-not-render.svg";
        const newFileName = `figure-${figureFiles.length}.svg`;

        try {
            file = renderFigure(figure);
        } catch (e: any) {
            console.warn(
                "Error when rendering; using fallback",
                printRaw(figure),
                e,
                "" + e.stdout
            );
        }
        // Since everything is hashed with md5 sums, there should be no issue just returning
        // the rendered file name, for now.
        //fs.copyFileSync(file, `out/${newFileName}`);
        //figureFiles.push(newFileName);
        figureFiles.push(file);
    }

    return {
        content: (moduleAst as Ast.Root).content,
        tikzSvgRenders: figureFiles,
        headings,
    };
}

const OUT_DIR = "out";

export function renderModule(mod: ModuleInfo) {
    // The first `\input` command is assumed to be the only file we need.
    const file = mod.linkedFiles[0];
    const rawModuleName = basename(file).replace(/\.tex/, "");
    const fileSrc = fs.readFileSync(`../book/${file}`, "utf8");
    let { content, tikzSvgRenders, headings } = processFile(fileSrc);
    if (!fs.existsSync(OUT_DIR)) {
        fs.mkdirSync(OUT_DIR);
    }
    const figsDir = OUT_DIR + "/figs";
    if (!fs.existsSync(figsDir)) {
        fs.mkdirSync(figsDir);
    }
    // Copy all the figures into the right place and reference them correctly.
    content = walkAst(
        content,
        (node) => {
            try {
                // Replace the figure with an image node
                const origPath = tikzSvgRenders.shift() || "";
                const figName = `figs/${basename(origPath)}`;
                fs.copyFileSync(origPath, `${OUT_DIR}/${figName}`);
                return tools.html.tagLikeMacro({
                    tag: "img",
                    attributes: { src: figName || "", class: "tikz-figure" },
                });
            } catch (e) {
                console.warn(
                    "Found tikz environment",
                    printRaw(node),
                    "but there was no corresponding rendered image"
                );
                return tools.html.tagLikeMacro({
                    tag: "div",
                    content: [
                        { type: "string", content: "COULD NOT FIND IMAGE" },
                    ],
                });
            }
        },
        ((node) =>
            tools.match.environment(
                node,
                "tikzpicture"
            )) as Ast.TypeGuard<Ast.Node>
    ) as Ast.Node[];

    // We want to make sure that the module pre-information is properly turned into html.
    // The fastest way to do that is to just re-parse it.
    const { content: introContent } = processFile(printRaw(mod.introContent));

    const moduleTitle = tools.convertToHtml(mod.title) as Ast.Node[];
    return {
        content: [
            tools.tagLikeMacro({
                tag: "h1",
                attributes: {
                    class: "module-title",
                    id: mod.label || rawModuleName,
                },
                content: moduleTitle,
            }),
            ...introContent,
            ...content,
        ],
        rawModuleName,
        rawModuleTitle: printRaw(moduleTitle),
        headings,
    };
}

export const allModuleInfo = allModules.map(processModuleEnvironment);
export const allAppendixInfo = allAppendices.map(processModuleEnvironment);

export { bookAst, allModules, allAppendices };
