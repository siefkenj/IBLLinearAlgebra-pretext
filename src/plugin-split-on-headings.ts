import { Plugin } from "unified";
import * as Ast from "@unified-latex/unified-latex-types";
import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import { wrapPars } from "@unified-latex/unified-latex-to-hast";
import { splitOnMacro } from "@unified-latex/unified-latex-util-split";

/**
 * This plugin splits a LaTeX AST on '\Heading{}' macros,
 * puts the argument in '\html-tag:title{...}' macros,
 * wraps any paragraphs in '\html-tag:p{...}' macros,
 * and then finally wraps the content between the current '\Heading{}' macro
 * and the next one in '\html-tag:section{...}' macros.
 */
export const splitOnHeadings: Plugin<[], Ast.Root, Ast.Root> =
    function splitOnHeadings() {
        return function (ast: Ast.Root) {
            // Split the AST on '\Heading{}' macros
            const split = splitOnMacro(ast.content, "Heading");

            // Replace '\Heading{}' macros with '\html-tag:title{...}' html-like macros
            const newHeadings = split.macros.map((heading) =>
                htmlLike({ tag: "title", content: heading.args![0].content })
            );
            // Wrap any paragraphs in '\html-tag:p{...}' html-like macros
            const pars = split.segments.map((seg) =>
                wrapPars(seg, {
                    macrosThatBreakPars: ["SavedDefinitionRender"],
                })
            );
            let sections: Ast.Root["content"] = [];
            // Procced only if there are \Heading{}' macros in the original AST tree.
            if (newHeadings.length > 0) {
                for (let i = 0; i < newHeadings.length; i++) {
                    let sectionContent: Ast.Node[] = [newHeadings[i]];
                    for (let j = 0; j < pars[i + 1].length; j++) {
                        sectionContent.push(pars[i + 1][j]);
                    }
                    // Wrap everything in in '\html-tag:section{...}' html-like macros.
                    const section = htmlLike({
                        tag: "section",
                        content: sectionContent,
                    });
                    sections.push(section);
                }
                // Manipulate the AST tree with the changes
                ast.content = sections;
            }
        };
    };
