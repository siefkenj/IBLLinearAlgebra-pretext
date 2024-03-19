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
    }
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
};
