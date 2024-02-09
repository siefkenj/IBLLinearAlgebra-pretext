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
                if (
                    match.string(node, "*") &&
                    (info.parents[0].type === "mathenv" ||
                        info.parents[0].type === "inlinemath" ||
                        info.parents[0].type === "displaymath")
                ) {
                    // look for a * in the content then check there is a \Set macro before it
                    let starIndex = 0;
                    let i = 0;
                    for (i; i < info.parents[0].content.length; i++) {
                        
                        if (match.string(info.parents[0].content[i], "*")) {
                            starIndex = i;
                            break;
                        }
                    }
                    if (
                        starIndex !== 0 &&
                        match.macro(info.parents[0].content[i - 1], "Set")
                    )
                    return [];
                } else {
                    return node;
                }
            });
        };
    };
