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
                    match.macro(node, "newpage") ||
                    match.macro(node, "newcommand") ||
                    match.macro(node, "newenvironment")
                ) {
                    return null;
                } else if (match.environment(node, "center")) {
                    if (match.group(node.content[0])) {
                        return null;
                    }

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
