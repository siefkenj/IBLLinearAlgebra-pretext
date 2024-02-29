import { Plugin } from "unified";
import * as Ast from "@unified-latex/unified-latex-types";
import { wrapPars } from "@unified-latex/unified-latex-to-hast";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { match } from "@unified-latex/unified-latex-util-match";

/**
 * Split the contents of the `\begin{section}`, `\begin{subsection}`, and `\begin{introduction}`
 * and wrap them in `<p>` tags as appropriate.
 */
export const pluginSplitPars: Plugin<[], Ast.Root, Ast.Root> =
    function pluginSplitPars() {
        return function (ast: Ast.Root) {
            visit(ast, (node, info) => {
                if (
                    !(
                        match.environment(node, "section") ||
                        match.environment(node, "subsection") ||
                        match.environment(node, "introduction")
                    )
                ) {
                    return;
                }

                node.content = wrapPars(node.content, {
                    macrosThatBreakPars: ["SavedDefinitionRender"],
                });
            });
        };
    };
