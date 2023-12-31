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
                    match.macro(node, "smallskip")
                ) {
                    return null;
                } else if (match.environment(node, "minipage")) {
                    return node.content;
                }
            });
        };
    };
