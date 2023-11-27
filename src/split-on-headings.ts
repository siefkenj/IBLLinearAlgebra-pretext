import { Plugin } from "unified";
import * as Ast from "@unified-latex/unified-latex-types";
import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import { wrapPars } from "@unified-latex/unified-latex-to-hast";
import { splitOnMacro } from "@unified-latex/unified-latex-util-split";

export const splitOnHeadings: Plugin<[], Ast.Root, Ast.Root> =
    function splitOnHeadings() {
        return function (ast: Ast.Root) {
            const split = splitOnMacro(ast.content, "Heading");

            const newHeadings = split.macros.map((heading) =>
                htmlLike({ tag: "title", content: heading.args![0].content })
            );
            const pars = split.segments.map((seg) => wrapPars(seg));
            let sections: Ast.Root["content"] = [];
            if (newHeadings.length > 0) {
                for (let i = 0; i < newHeadings.length; i++) {
                    let sectionContent: Ast.Node[] = [newHeadings[i]];
                    for (let j = 0; j < pars[i + 1].length; j++) {
                        sectionContent.push(pars[i + 1][j]);
                    }
                    const section = htmlLike({
                        tag: "section",
                        content: sectionContent,
                    });
                    sections.push(section);
                }
                ast.content = sections;
            }
        };
    };
