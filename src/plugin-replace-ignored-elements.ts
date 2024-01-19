import { Plugin } from "unified";
import * as Ast from "@unified-latex/unified-latex-types";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";
import { match } from "@unified-latex/unified-latex-util-match";

export const replaceIgnoredElements: Plugin<[], Ast.Root, Ast.Root> =
    function replaceIgnoredElements() {
        return function (ast) {
            replaceNode(ast, (node) => {
                if (
                    match.macro(node, "hfill") ||
                    match.macro(node, "smallskip") ||
                    match.macro(node, "emptybox")  ||
                    match.macro(node, "medskip") 
                    // match.environment(node, "center")
                ) {
                    return null;
                } else if (match.environment(node, "minipage") || match.environment(node, "center")) {
                    return (node as Ast.Environment).content;
                }
            });
        };
    };
