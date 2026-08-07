import { Plugin } from "unified";
import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { toString } from "@unified-latex/unified-latex-util-to-string";
import { env, s } from "@unified-latex/unified-latex-builder";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";

/**
 * Split a tikz option list on the commas that separate its entries, ignoring
 * any comma nested inside a group, a coordinate or a bracketed value.
 */
function splitOptions(options: string): string[] {
    const items: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < options.length; i++) {
        const c = options[i];
        if (c === "{" || c === "[" || c === "(") {
            depth++;
        } else if (c === "}" || c === "]" || c === ")") {
            depth--;
        } else if (c === "," && depth === 0) {
            items.push(options.slice(start, i));
            start = i + 1;
        }
    }
    items.push(options.slice(start));
    return items;
}

/**
 * Drop `baseline` from a tikz option list.
 *
 * `baseline` says where a picture sits relative to the line of text it is set
 * in. A latex-image has no surrounding text: pretext compiles it on its own and
 * then scales it with `\resizebox{\width}{\height}`. A baseline that puts the
 * whole picture below the reference point -- `baseline=(current bounding
 * box.north)` is the one this book uses, 22 times -- leaves the box with zero
 * height, and scaling it to its own height is a division by zero. The picture
 * is identical without it.
 */
function stripBaseline(options: string): string {
    return splitOptions(options)
        .filter((item) => !/^\s*baseline\s*(=|$)/.test(item))
        .join(",");
}

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
                    const args = node.args
                        ?.map((arg) => {
                            if (arg.content.length === 0) {
                                return arg;
                            }
                            const options = stripBaseline(
                                toString(arg.content)
                            );
                            return {
                                ...arg,
                                content: options.trim() ? [s(options)] : [],
                            };
                        })
                        // An option list that is now empty is dropped rather
                        // than emitted as a bare `[]`.
                        .filter(
                            (arg) =>
                                arg.content.length > 0 || arg.openMark !== "["
                        );
                    return env("tikzpicture", toString(node.content), args);
                }
            });
        };
    };
