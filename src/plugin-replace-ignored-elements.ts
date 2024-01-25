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
                    match.macro(node, "noindent")
                ) {
                    return null;
                } else if (
                    match.environment(node, "minipage") ||
                    match.environment(node, "center")
                ) {
                    return node.content;
                }
            });
        };
    };
