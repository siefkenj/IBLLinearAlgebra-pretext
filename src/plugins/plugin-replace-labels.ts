import { Plugin } from "unified";

import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";
import { m } from "@unified-latex/unified-latex-builder";
import { toString } from "@unified-latex/unified-latex-util-to-string";

/**
 * This plugin replaces `\label{}` macros by attributing an id to the first most significant parent of the macro.
 */
export const replaceLabels: Plugin<[], Ast.Root, Ast.Root> =
    function replaceLabels() {
        return function (tree: Ast.Root) {
            replaceNode(tree, (node, info) => {
                // Check if the current node is a label
                if (match.macro(node, "label")) {
                    // Read the argument of the label macro which will be the id attribute
                    const id = toString(getArgsContent(node)[0] as Ast.Node[])
                        .replace(/:/g, "")
                        .replace(/ /g, "");
                    // If the first parent is of type argument, we want to get the next parent since argument is not significant
                    const idx = info.parents[0].type === "argument" ? 1 : 0;

                    // The cases where the parent is problist or align are treated differently. This is because labels are never a direct children of problist
                    // or align in the textbook. Rather, they are actually children of "\prob" macro (in problist) or "\" macro (in align).
                    if (match.environment(info.parents[idx], "problist")) {
                        // Read the contents of problist
                        const content = (info.parents[idx] as Ast.Environment)
                            .content;
                        // This will be the index of the "\prob" macro that will be given the id attribute
                        let probIdx: number = 0;
                        // Iterate through the content
                        for (let i = 0; i < content.length; i++) {
                            // If the current element is "\prob" macro, save the index.
                            if (
                                match.macro(
                                    (info.parents[idx] as Ast.Environment)
                                        .content[i],
                                    "prob"
                                )
                            ) {
                                probIdx = i;
                                // If the current element is equal to the current "\label{}" macro, attribute id to the last found "\prob" macro
                                // through _renderInfo
                            } else if (node === content[i]) {
                                const renderInfo =
                                    content[probIdx]._renderInfo ?? {};
                                renderInfo.id = id;
                                content[probIdx]._renderInfo = renderInfo;
                                break;
                            }
                        }
                    } else if (match.environment(info.parents[idx], "align")) {
                        const align = info.parents[idx] as Ast.Environment;
                        const alignRenderInfo = align._renderInfo ?? {};
                        const content = align.content;
                        // Pass an extra "\" macro to the align environment. If the label is in the first row, there should be a macro in front it that
                        // receives the id attribute.
                        alignRenderInfo.extraMacro = m("\\");
                        align._renderInfo = alignRenderInfo;
                        // This will be the index of the "\\" macro that will be given the id attribute
                        let alignIdx: number = 0;
                        // Iterate through the content
                        for (let i = 0; i < content.length; i++) {
                            // If the current element is "\\" macro, save the index.
                            if (
                                match.macro(
                                    (info.parents[idx] as Ast.Environment)
                                        .content[i],
                                    "\\"
                                )
                            ) {
                                alignIdx = i;
                                // If the current element is equal to the current "\label{}" macro, attribute id to the last found "\\" macro
                                // through _renderInfo.
                            } else if (node === content[i]) {
                                // If the label is found in the first row, give the id attribute to the extra macro in the align environment's _renderInfo
                                if (alignIdx == 0) {
                                    const renderInfo =
                                        (
                                            align._renderInfo
                                                .extraMacro as Ast.Macro
                                        )._renderInfo ?? {};
                                    renderInfo.id = id;
                                    (
                                        align._renderInfo
                                            .extraMacro as Ast.Macro
                                    )._renderInfo = renderInfo;
                                    // Otherwise, proceeds as normal
                                } else {
                                    const renderInfo =
                                        content[alignIdx]._renderInfo ?? {};
                                    renderInfo.id = id;
                                    content[alignIdx]._renderInfo = renderInfo;
                                }

                                break;
                            }
                        }
                    } else {
                        // This is the regular case. Attach the id attribute the parent node through _renderInfo.
                        const renderInfo = info.parents[idx]._renderInfo ?? {};
                        renderInfo.id = id;
                        info.parents[idx]._renderInfo = renderInfo;
                    }

                    // Remove the label macro from the tree
                    return null;
                }
            });
        };
    };
