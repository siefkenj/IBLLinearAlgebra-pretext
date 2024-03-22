import { Plugin, Parser, unified } from "unified";
import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import { s } from "@unified-latex/unified-latex-builder";
import { wrapPars } from "@unified-latex/unified-latex-to-hast";
import {
    unifiedLatexAstComplier,
    unifiedLatexFromString,
    unifiedLatexFromStringMinimal,
    unifiedLatexProcessAtLetterAndExplMacros,
    unifiedLatexProcessMacrosAndEnvironmentsWithMathReparse,
} from "@unified-latex/unified-latex-util-parse";
import { EXIT, visit } from "@unified-latex/unified-latex-util-visit";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";
import { attachMacroArgs } from "@unified-latex/unified-latex-util-arguments";
import { trimRenderInfo } from "@unified-latex/unified-latex-util-render-info";

type Options = {
    /**
     * The source of `linearalgebra.tex`.
     */
    bookSource: string;
    /**
     * A map of modules-source-name to source. E.g. `{ "modules/module1.tex": "..." }`.
     * The keys should be exactly what appears as the argument to the `\input{...}` macros.
     */
    modulesSource: Record<string, string>;
    /**
     * A list of modules to be processed. These will be string-matched against the file name of each module.
     * E.g. `["module1.tex", "appendix1.tex"]` will match both `modules/module1.tex` and `modules/appendix1.tex`.
     */
    onlyProcess?: string[];
};

// Parse the sources supplied in `bookSource` and `modulesSource` into LaTeX AST.
// All sources are combined into a single large AST which can the be run through the rest of the conversion pipeline.
export const pluginParseBookSource: Plugin<Options[], string, Ast.Root> =
    function pluginParseBookSource(options) {
        const fullParser = unified()
            .use(unifiedLatexFromStringMinimal)
            .use(unifiedLatexProcessMacrosAndEnvironmentsWithMathReparse, {
                macros: { input: { signature: "m" } },
                environments: {},
            })
            .use(unifiedLatexAstComplier);

        const parser: Parser<Ast.Root> = (str) => {
            const bookAst = fullParser.parse(options.bookSource);

            // Get a list of all the modules and appendices
            let modulesAndAppendices: Ast.Environment[] = [];
            visit(bookAst, (node) => {
                if (
                    match.environment(node, "module") ||
                    match.environment(node, "appendix")
                ) {
                    modulesAndAppendices.push(node);
                }
            });

            // Filter `modulesAndAppendices` to only include only the ones that have `\include{...}` macros
            // and those in `options.onlyProcess` if it is defined.
            modulesAndAppendices = modulesAndAppendices.filter((module) => {
                let inputMacroArg: string = "";

                attachMacroArgs(module, { input: { signature: "m" } });

                visit(module, (node) => {
                    if (match.macro(node, "input")) {
                        inputMacroArg = printRaw(node.args![0].content);
                        return EXIT;
                    }
                });
                if (inputMacroArg === "") {
                    return false;
                }
                if (options.onlyProcess) {
                    return options.onlyProcess.some((name) =>
                        inputMacroArg.includes(name)
                    );
                }
                return true;
            });

            const root: Ast.Root = {
                type: "root",
                content: modulesAndAppendices,
            };

            // Parse the content of any `\input{...}` macros and stick them in the tree.
            replaceNode(root, (node) => {
                if (match.macro(node, "input")) {
                    const arg = printRaw(node.args![0].content);
                    const source = options.modulesSource[arg];
                    if (!source) {
                        throw new Error(
                            `Could not find module source for "${arg}".`
                        );
                    }
                    return fullParser.parse(source).content;
                }
            });

            return trimRenderInfo(root);
        };

        Object.assign(this, { Parser: parser });
    };
