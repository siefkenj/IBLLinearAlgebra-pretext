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
            replaceNode(ast, (node) => {
                if (
                    match.macro(node, "hfill") ||
                    match.macro(node, "smallskip") ||
                    match.macro(node, "medskip") ||
                    match.macro(node, "bigskip") ||
                    match.macro(node, "emptybox") ||
                    match.macro(node, "noindent") ||
                    match.parbreak(node)
                ) {
                    return null;
                } else if (match.environment(node, "center")) {
                    let tikzCount = 0;
                    for (let i = 0; i < node.content.length; i++) {
                        if (match.environment(node.content[i], "tikzpicture")) {
                            tikzCount++;
                        }
                    }
                    if (tikzCount <= 1) {
                        return node.content;
                    }
                } else if (match.environment(node, "minipage")) {
                    return (node as Ast.Environment).content;
                }
            });
        };
    };
