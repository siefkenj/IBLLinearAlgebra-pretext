import { Plugin } from "unified";
import * as Ast from "@unified-latex/unified-latex-types";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";
import { match } from "@unified-latex/unified-latex-util-match";

/**
 * This plugin removes LaTeX elements that have no significance in PreTeXt.
 */
export const replaceIgnoredElements: Plugin<[], Ast.Root, Ast.Root> =
    function replaceIgnoredElements() {
        return function (ast) {
            replaceNode(ast, (node, info) => {
                if (
                    match.macro(node, "hfill") ||
                    match.macro(node, "smallskip") ||
                    match.macro(node, "medskip") ||
                    match.macro(node, "bigskip") ||
                    match.macro(node, "emptybox") ||
                    match.macro(node, "noindent") ||
                    match.macro(node, "hspace") ||
                    match.macro(node, "newpage")
                ) {
                    return null;
                    // } else if (
                    //     match.macro(node, "\\") &&
                    //     info.context.inMathMode === false
                    // ) {
                    //     return { type: "parbreak" };
                } else if (match.environment(node, "center")) {
                    let tikzCount = 0;
                    let includegraphicsCount = 0;
                    node.content.forEach((node) => {
                        if (match.environment(node, "tikzpicture")) {
                            tikzCount++;
                        } else if (match.macro(node, "includegraphics")) {
                            includegraphicsCount++;
                        }
                    });
                    if (tikzCount <= 1 && includegraphicsCount == 0) {
                        return node.content;
                    } else if (tikzCount > 1) {
                        const renderInfo = node._renderInfo ?? {};
                        renderInfo.hasTikzpictures = true;
                        node._renderInfo = renderInfo;
                    }
                } else if (match.environment(node, "minipage")) {
                    return (node as Ast.Environment).content;
                }
            });
        };
    };
