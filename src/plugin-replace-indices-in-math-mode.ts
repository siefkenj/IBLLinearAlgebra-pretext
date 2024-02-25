import { Plugin } from "unified";

import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";
import { htmlLike } from "@unified-latex/unified-latex-util-html-like";

/**
 * This plugin replaces "\index{}" macros found in math environments before HTML conversion.
 */
export const replaceIndicesInMathMode: Plugin<[], Ast.Root, Ast.Root> =
    function replaceIndicesInMathMode() {
        return function (tree: Ast.Root) {
            replaceNode(tree, (node, info) => {
                // Check if the node is a index, and its parent is a math environment
                if (
                    match.macro(node, "index") &&
                    info.parents[0].type === "mathenv"
                ) {
                    // Replace the index with a html-lie macro
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
                }
            });
        };
    };
