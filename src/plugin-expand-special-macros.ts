import { Plugin } from "unified";

import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";
import {
    attachNeededRenderInfo,
    katexSpecificMacroReplacements,
} from "@unified-latex/unified-latex-to-hast";
import { expandMacros } from "@unified-latex/unified-latex-util-macros";
import { arg, args, s } from "@unified-latex/unified-latex-builder";

/**
 * Expand macros before the HTML conversion. For example `\systeme` gets converted to array form, etc.
 */
export const pluginExpandSpecialMacros: Plugin<[], Ast.Root, Ast.Root> =
    function pluginExpandSpecialMacros() {
        const isKatexMacro = match.createMacroMatcher(
            katexSpecificMacroReplacements
        );
        return function (tree: Ast.Root) {
            expandMacros(tree, [
                {
                    name: "hdash",
                    // This will be processed by MathJax later, so there is no need to supply actual nodes. A string will do.
                    body: [s("\\rule[.15em]{2.1em}{.5pt}")],
                },
            ]);

            attachNeededRenderInfo(tree);
            replaceNode(tree, (node) => {
                if (isKatexMacro(node)) {
                    return katexSpecificMacroReplacements[node.content](node);
                }
                if (match.environment(node, "bmatrix")) {
                    const augmentArg = node.args?.[0]?.content;
                    if (augmentArg) {
                        const retNode: Ast.Environment = {
                            type: "environment",
                            env: "array",
                            args: [arg(augmentArg, { braces: "{}" })],
                            content: node.content,
                        };
                        return [s("\\left["), retNode, s("\\right]")];
                    }
                }
            });
        };
    };
