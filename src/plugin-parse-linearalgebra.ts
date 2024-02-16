import { Plugin } from "unified";
import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import { s } from "@unified-latex/unified-latex-builder";
import { wrapPars } from "@unified-latex/unified-latex-to-hast";

export const parseLinearalgebra: Plugin<[], Ast.Root, Ast.Root> =
    function parseLinearalgebra() {
        return function (tree: Ast.Root) {
            const document = tree.content.filter((node) =>
                match.environment(node, "document")
            )[0] as Ast.Environment;

            if (document != undefined) {
                const bookonly = document.content.filter((node) =>
                    match.environment(node, "bookonly")
                )[0] as Ast.Environment;

                let inputs = bookonly.content.filter((node) => {
                    return match.macro(node, "input");
                });

                const center = bookonly.content.filter((node) => {
                    return match.environment(node, "center");
                })[0] as Ast.Environment;

                let modules: Ast.Environment[] = [];
                let appendices: Ast.Environment[] = [];

                for (let node of document.content) {
                    if (match.environment(node, "module")) {
                        modules.push(node);
                    } else if (match.environment(node, "appendix")) {
                        appendices.push(node);
                    }
                }

                const titlepage = htmlLike({
                    tag: "titlepage",
                    content: htmlLike({
                        tag: "author",
                        content: htmlLike({
                            tag: "personname",
                            content: s("Jason Siefken"),
                        }),
                    }),
                });

                const dedication = htmlLike({
                    tag: "dedication",
                    content: wrapPars(center.content),
                });

                const preface = htmlLike({
                    tag: "preface",
                    content: inputs[0],
                });

                const contributors = htmlLike({
                    tag: "preface",
                    content: [
                        htmlLike({
                            tag: "title",
                            content: s("Contributors"),
                        }),
                        inputs[1],
                    ],
                });

                const index = htmlLike({
                    tag: "index",
                    content: [
                        htmlLike({
                            tag: "title",
                            content: s("Index"),
                        }),
                        htmlLike({
                            tag: "index-list",
                        }),
                    ],
                });

                const frontmatter = htmlLike({
                    tag: "frontmatter",
                    content: [titlepage, dedication, preface, contributors],
                });

                const backmatter = htmlLike({
                    tag: "backmatter",
                    content: [...appendices, index],
                });

                const book = htmlLike({
                    tag: "book",
                    content: [
                        htmlLike({
                            tag: "title",
                            content: s("Linear Algebra"),
                        }),
                        frontmatter,
                        ...modules,
                        backmatter,
                    ],
                });

                tree.content = [
                    htmlLike({
                        tag: "pretext",
                        content: book,
                        attributes: {
                            "xml:lang": "en-US",
                            "xmlns:xi": "http://www.w3.org/2001/XInclude",
                        },
                    }),
                ];
            }
        };
    };
