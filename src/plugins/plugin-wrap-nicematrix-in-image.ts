import { Plugin } from "unified";
import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { toString } from "@unified-latex/unified-latex-util-to-string";
import { env } from "@unified-latex/unified-latex-builder";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";
import { visit, EXIT } from "@unified-latex/unified-latex-util-visit";

/**
 * NiceMatrix is not supported by MathJax, so we wrap any NiceMatrix environments in an image.
 */
export const pluginWrapNiceMatrixInImage: Plugin<[], Ast.Root, Ast.Root> =
    function pluginWrapNiceMatrixInImage() {
        return function (ast: Ast.Root) {
            replaceNode(ast, (node) => {
                if (!match.math(node)) {
                    return;
                }

                // The math nodes are what we want to wrap. So we search in a math node to see
                // if it has a NiceMatrix environment.
                let hasNiceMatrix = false;
                visit(node.content, (node) => {
                    if (match.anyEnvironment(node)) {
                        let envName = node.env;

                        if (
                            typeof envName === "string" &&
                            (node.env.endsWith("NiceMatrix") ||
                                node.env.endsWith("NiceArray"))
                        ) {
                            hasNiceMatrix = true;
                            return EXIT;
                        }
                    }
                });

                if (!hasNiceMatrix) {
                    return;
                }

                // We can only render properly if we are inline math.
                node.type = "inlinemath";
                let nodeAsStr = toString(node);

                return env("tikzpicture", `\\node{${nodeAsStr}};`);
            });
        };
    };
