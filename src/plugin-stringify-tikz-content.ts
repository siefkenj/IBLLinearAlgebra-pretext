import { Plugin } from "unified";
import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { toString } from "@unified-latex/unified-latex-util-to-string";
import { env } from "@unified-latex/unified-latex-builder";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";

/**
 * Plugin to be used before converting to Hast, which converts the content within 
 * tikzpicture environments into strings, so they are not mangled by other conversions
 */
export const stringifyTikzContent: Plugin<[], Ast.Root, Ast.Root> =
    function stringifyTikzContent() {
        return function (ast: Ast.Root) {
            replaceNode(ast, (node) => {
                if (match.environment(node, "tikzpicture")) {
                    return env("tikzpicture", toString(node.content));
                }
            })
        }
    }