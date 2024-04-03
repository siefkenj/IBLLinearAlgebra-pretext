import { Plugin } from "unified";
import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";
import { m } from "@unified-latex/unified-latex-builder";

/**
 * This plugin replaces \norm* found in math environments with \Norm before HTML conversion
 */
export const replaceNormStar: Plugin<[], Ast.Root, Ast.Root> =
    function replaceNormStar() {
        return function (tree: Ast.Root) {
            replaceNode(tree, (node, info) => {
                if (!(match.macro(node, "norm") || match.string(node, "*")) || !info.context.inMathMode) {
                    return;
                }
                // check if the node after is a * then replace norm with Norm
                if (
                    info.index !== undefined &&
                    info.containingArray !== undefined &&
                    info.index < info.containingArray.length &&
                    match.string(info.containingArray[info.index + 1], "*")
                ) {
                    console.log("replacing norm");
                    return m("Norm");
                }

                // // check if the node before is a Norm macro then remove the star
                if (
                    info.index !== undefined &&
                    info.index > 0 &&
                    info.containingArray !== undefined &&
                    match.macro(info.containingArray[info.index - 1], "Norm")
                ) {
                    console.log("replacing star");
                    return null;
                }
            });
        };
    };
