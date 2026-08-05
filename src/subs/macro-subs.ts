import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";
import { splitOnMacro } from "@unified-latex/unified-latex-util-split";
import * as Ast from "@unified-latex/unified-latex-types";
import { toString } from "@unified-latex/unified-latex-util-to-string";
import { VisitInfo } from "@unified-latex/unified-latex-util-visit";
import { s } from "@unified-latex/unified-latex-builder";
import { parse } from "@unified-latex/unified-latex-util-parse";

export const macroInfo: Ast.MacroInfoRecord = {
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
    ref: {
        signature: "m",
    },
    eqref: {
        signature: "m",
    },
    label: {
        signature: "m",
    },
    prob: {
        signature: "o",
    },
    hefferon: {
        signature: "o",
    },
    beezer: {
        signature: "o",
    },
    Title: {
        signature: "m",
    },
    url: {
        signature: "m",
    },
    href: {
        signature: "m m",
    },
    sortitem: {
        signature: "o m",
    },
    displaybreak: {
        signature: "o",
    },
    // Figure macros from `module15-eigenvector-visuals.tex`. Each one expands
    // to one or more tikzpictures, so the call is handed to pretext verbatim
    // and compiled against the latex-image preamble lifted out of that file.
    // The signatures have to match the LaTeX definitions or the arguments are
    // left behind in the text.
    EVTransformPair: {
        signature: "o m m m m",
    },
    EVcircle: {
        signature: "o o m m m m m m",
    },
    EVgrid: {
        signature: "m m m m",
    },
    EVFigures: {
        signature: "o o m m m m m m",
    },
};

/**
 * Figure macros that are passed through to pretext as `latex-image`, with the
 * width each one is given in the rendered book. The pair figure is six panels
 * wide and needs the whole measure; the overlays are single squares.
 *
 * Only `\EVTransformPair` and `\EVcircle` are called from the book at the
 * moment. `\EVgrid` and `\EVFigures` are listed so that they render if they are
 * ever called directly -- today they are only reached from inside the other
 * two, which pretext expands itself from the latex-image preamble.
 */
const latexImageMacroWidths: Record<string, string> = {
    EVTransformPair: "100%",
    EVcircle: "60%",
    EVgrid: "60%",
    EVFigures: "60%",
};

export const macroReplacements: Record<
    string,
    (node: Ast.Macro, info: VisitInfo) => Ast.Node
> = {
    footnote: (node) => {
        const args = getArgsContent(node);
        const split = splitOnMacro(args[0] as Ast.Node[], "html-tag:idx");
        if (split.macros.length === 0) {
            return htmlLike({
                tag: "fn",
                content: args[0] || [],
            });
        }

        const footnote = htmlLike({
            tag: "fn",
            content: ([] as Ast.Node[]).concat(...split.segments),
        });

        return {
            type: "root",
            content: [footnote].concat(split.macros),
        };
    },
    index: (node) => {
        const args = getArgsContent(node);
        const formattedArgs = args.flatMap((arg) => {
            if (arg == null) {
                return [];
            } else {
                const headings = toString(arg)
                    .split("!")
                    .flatMap((str) => {
                        return htmlLike({
                            tag: "h",
                            // The index might contain math, so it's safest to reparse.
                            content: parse(str),
                        });
                    });
                return headings;
            }
        });
        return htmlLike({
            tag: "idx",
            content: formattedArgs,
        });
    },
    includegraphics: (node) => {
        const args = getArgsContent(node);
        const path = printRaw(args[args.length - 1] || []);
        return htmlLike({
            tag: "image",
            content: s(" "),
            attributes: { source: path },
        });
    },
    emph: (node) => {
        const args = getArgsContent(node);
        return htmlLike({
            tag: "em",
            content: args[0] || [],
        });
    },
    textsc: (node) => {
        const args = getArgsContent(node)[0]?.flatMap((arg) => {
            if (arg.type === "string") {
                arg.content = arg.content.toUpperCase();
            }
            return arg;
        });
        return htmlLike({
            tag: "em",
            content: args,
        });
    },
    ref: (node) => {
        const args = getArgsContent(node) as Ast.Node[][];
        return htmlLike({
            tag: "xref",
            attributes: {
                ref: toString(args[0]).replace(/:/g, "").replace(/ /g, ""),
                text: "global",
            },
        });
    },
    textbf: (node) => {
        const args = getArgsContent(node);
        return htmlLike({
            tag: "alert",
            content: args[0] || [],
        });
    },
    textcolor: (node) => {
        const args = getArgsContent(node);
        return htmlLike({
            tag: "alert",
            content: args[2] || [],
        });
    },
    textsf: (node) => {
        const args = getArgsContent(node);
        return htmlLike({
            tag: "em",
            content: args[0] || [],
        });
    },
    textit: (node) => {
        const args = getArgsContent(node);
        return htmlLike({
            tag: "em",
            content: args[0] || [],
        });
    },
    textsl: (node) => {
        const args = getArgsContent(node);
        return htmlLike({
            tag: "em",
            content: args[0] || [],
        });
    },
    texttt: (node) => {
        const args = getArgsContent(node);
        return htmlLike({
            tag: "em",
            content: args[0] || [],
        });
    },
    textrm: (node) => {
        const args = getArgsContent(node);
        return htmlLike({
            tag: "em",
            content: args[0] || [],
        });
    },
    eqref: (node) => {
        const args = getArgsContent(node) as Ast.Node[][];
        return htmlLike({
            tag: "xref",
            attributes: {
                ref: toString(args[0]).replace(/:/g, "").replace(/ /g, ""),
                text: "global",
            },
        });
    },
    mbox: (node) => {
        const args = getArgsContent(node);
        return {
            type: "root",
            content: args[0] || [],
        };
    },
    hefferon: (node) => {
        const arg = getArgsContent(node)[0];
        const annotation = `Hefferon's Linear Algebra ${
            arg == null ? "" : `(${toString(arg)})`
        }`;
        return {
            type: "string",
            content: annotation,
        };
    },
    Title: (node) => {
        const args = getArgsContent(node);
        return htmlLike({
            tag: "title",
            content: args[0] || [],
        });
    },
    url: (node) => {
        const args = getArgsContent(node);
        return htmlLike({
            tag: "url",
            attributes: {
                href: toString((args as Ast.Node[][])[0]),
            },
        });
    },
    href: (node) => {
        const args = getArgsContent(node);
        return htmlLike({
            tag: "url",
            attributes: {
                href: toString((args as Ast.Node[][])[0]),
                visual: toString(
                    getArgsContent((args[1] as Ast.Macro[])[0])[0] as Ast.Node[]
                ),
            },
        });
    },
    section: (node) => {
        const args = getArgsContent(node);
        return htmlLike({
            tag: "title",
            content: args[4] || [],
        });
    },
    subsection: (node) => {
        const args = getArgsContent(node);
        return htmlLike({
            tag: "p",
            content: htmlLike({
                tag: "alert",
                content: args[3] || [],
            }),
        });
    },
    beezer: (node) => {
        const arg = getArgsContent(node)[0];
        const annotation = `Beezer's A First Course in Linear Algebra ${
            arg == null ? "" : `(${toString(arg)})`
        }`;
        return {
            type: "string",
            content: annotation,
        };
    },
    ...Object.fromEntries(
        Object.entries(latexImageMacroWidths).map(([name, width]) => [
            name,
            (node: Ast.Macro) =>
                htmlLike({
                    tag: "figure",
                    content: [
                        htmlLike({ tag: "caption" }),
                        htmlLike({
                            tag: "image",
                            content: htmlLike({
                                tag: "latex-image",
                                // The call itself, arguments and all. The macro
                                // is defined in the latex-image preamble, so
                                // pretext expands it the way lualatex does.
                                content: s(printRaw(node)),
                            }),
                            attributes: { width },
                        }),
                    ],
                }),
        ])
    ),
};
