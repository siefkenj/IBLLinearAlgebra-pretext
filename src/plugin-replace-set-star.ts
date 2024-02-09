import { Plugin } from "unified";
import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";

/**
 * This plugin replaces \Set* found in math environments with \Set before HTML conversion
 */
export const replaceSetStar: Plugin<[], Ast.Root, Ast.Root> =
    function replaceSetStar() {
        return function (tree: Ast.Root) {
            replaceNode(tree, (node, info) => {
                if (!match.string(node, "*") || !info.context.inMathMode) {
                    return;
                }

                // check if the node before is a \Set macro
                if (
                    info.index !== undefined &&
                    info.index > 0 &&
                    info.containingArray !== undefined &&
                    match.macro(info.containingArray[info.index - 1], "Set")
                ) {
                    return null;
                }
            });
        };
    };
