import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";
import { splitOnMacro } from "@unified-latex/unified-latex-util-split";
import * as Ast from "@unified-latex/unified-latex-types";
import { toString } from "@unified-latex/unified-latex-util-to-string";
import { VisitInfo } from "@unified-latex/unified-latex-util-visit";

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
};

export const macroReplacements: Record<
    string,
    (
        node: Ast.Macro,
        info: VisitInfo
    ) => Ast.Macro | Ast.String | Ast.Environment | Ast.Root
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

        const fn = htmlLike({
            tag: "fn",
            content: ([] as Ast.Node[]).concat(...split.segments),
        });

        return {
            type: "root",
            content: [fn].concat(split.macros),
        };
    },
    index: (node) => {
        const args = getArgsContent(node);
        const formattedArgs = args.flatMap((arg) => {
            if (arg == null) {
                return [];
            } else {
                return htmlLike({
                    tag: "h",
                    content: arg,
                });
            }
        });
        return htmlLike({
            tag: "idx",
            content: formattedArgs,
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
                ref: toString(args[0]),
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
                ref: toString(args[0]),
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
    // label: (node, info) => {
    //     const arg = (
    //         getArgsContent(node as Ast.Macro) as Ast.String[][]
    //     )[0][0].content;
    //     console.log("hello");
    //     replaceNode(info.parents[info.parents.length - 1], (node) => {
    //         if (node === info.parents[1]) {
    //             const htmlLikeInfo = extractFromHtmlLike(
    //                 info.parents[1] as Ast.Macro
    //             );
    //             return htmlLike({
    //                 tag: htmlLikeInfo.tag,
    //                 content: htmlLikeInfo.content,
    //                 attributes: {
    //                     "xml:id": arg,
    //                     ...htmlLikeInfo.attributes,
    //                 },
    //             });
    //         } else if (match.macro(node, "label")) {
    //             return null;
    //         }
    //     });
    //     return node;
    // },
};
