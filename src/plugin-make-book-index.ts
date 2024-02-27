import { Plugin } from "unified";
import * as Ast from "@unified-latex/unified-latex-types";
import { htmlLike } from "@unified-latex/unified-latex-util-html-like";

/**
 * Adds a `<backmatter>` with an index after the modules
 */
export const pluginMakeBookIndex: Plugin<void[], Ast.Root, Ast.Root> =
    function pluginMakeBookIndex() {
        return function (ast: Ast.Root) {
            ast.content.push(
                htmlLike({
                    tag: "backmatter",
                    content: htmlLike({
                        tag: "index",
                        content: htmlLike({ tag: "index-list" }),
                    }),
                })
            );
        };
    };
