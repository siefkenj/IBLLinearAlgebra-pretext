import { Plugin } from "unified";
import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { toString } from "@unified-latex/unified-latex-util-to-string";
import { env, s } from "@unified-latex/unified-latex-builder";
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
                    // The environment's own arguments have to be carried
                    // across: `\begin{tikzpicture}[x=1pt,y=-13pt]` draws a
                    // different picture from `\begin{tikzpicture}`. They are
                    // stringified for the same reason the body is -- an option
                    // list is tikz source, not something later plugins should
                    // be rewriting.
                    const args = node.args?.map((arg) => ({
                        ...arg,
                        content:
                            arg.content.length > 0
                                ? [s(toString(arg.content))]
                                : [],
                    }));
                    return env("tikzpicture", toString(node.content), args);
                }
            });
        };
    };
