import { Plugin, unified } from "unified";
import * as Ast from "@unified-latex/unified-latex-types";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { match } from "@unified-latex/unified-latex-util-match";
import { splitOnMacro } from "@unified-latex/unified-latex-util-split";
import {
    unifiedLatexFromString,
    unifiedLatexFromStringMinimal,
    unifiedLatexProcessMacrosAndEnvironmentsWithMathReparse,
} from "@unified-latex/unified-latex-util-parse";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import { s } from "@unified-latex/unified-latex-builder";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";
import { wrapPars } from "@unified-latex/unified-latex-to-hast";

type Options = { modulesSource: Record<string, string> };

/**
 * Adds a `<introduction>` environment before the modules
 */
export const pluginMakeBookIntroduction: Plugin<Options[], Ast.Root, Ast.Root> =
    function pluginMakeBookIntroduction(options) {
        const contributorsSource =
            options?.modulesSource?.["common/contributors.tex"] || "";
        const prefaceSource =
            options?.modulesSource?.["modules/preface.tex"] || "";

        return function (ast: Ast.Root) {
            const introContent: Ast.Node[] = [];

            //
            // Title Page
            //

            introContent.push(
                htmlLike({
                    tag: "titlepage",
                    content: [
                        htmlLike({
                            tag: "author",
                            content: htmlLike({
                                tag: "personname",
                                content: [s("Jason Siefken")],
                            }),
                        }),
                        htmlLike({
                            tag: "date",
                            content: [htmlLike({ tag: "today" })],
                        }),
                    ],
                })
            );

            //
            // Dedication
            //

            introContent.push(
                htmlLike({
                    tag: "dedication",
                    content: [
                        htmlLike({
                            tag: "p",
                            content: [
                                s("This book is dedicated to "),
                                htmlLike({
                                    tag: "url",
                                    attributes: {
                                        href: "https://www.gazettetimes.com/news/local/obituaries/dr-robert-main-burton/article_9c087f07-c005-515a-bb3f-2c9c6a6b7332.html",
                                        visual: "Dr. Bob Burton",
                                    },
                                    content: [s("Dr. Bob Burton")],
                                }),
                                s("—friend and mentor."),
                            ],
                        }),
                        htmlLike({
                            tag: "blockquote",
                            content: [
                                htmlLike({
                                    tag: "em",
                                    content: s(
                                        "“Sometimes you have to walk the mystical path with practical feet.”"
                                    ),
                                }),
                            ],
                        }),
                    ],
                })
            );

            //
            // Preface
            //

            const prefaceAst = unified()
                .use(unifiedLatexFromStringMinimal)
                .parse(prefaceSource);
            processPreface(prefaceAst);

            introContent.push(
                htmlLike({
                    tag: "preface",
                    content: prefaceAst.content,
                })
            );

            //
            // Contributors
            //

            // Parse the contributors.tex file. We are only interested in the names, which are `\sortitem[]{}` macros.
            const contributorsAst = unified()
                .use(unifiedLatexFromString, {
                    macros: { sortitem: { signature: "o m" } },
                })
                .parse(contributorsSource);

            const names: { key: string; name: string }[] = [];
            visit(contributorsAst, (node) => {
                if (match.macro(node, "sortitem")) {
                    const key = printRaw(node.args?.[0].content || []);
                    const name = printRaw(node.args?.[1].content || []);
                    if (key && name) {
                        names.push({ key, name });
                    }
                }
            });
            names.sort((a, b) => a.key.localeCompare(b.key));

            // Add the contributors
            // They go in their own `<preface>`
            introContent.push(
                htmlLike({
                    tag: "preface",
                    content: [
                        htmlLike({
                            tag: "title",
                            content: [s("Contributors")],
                        }),
                        htmlLike({
                            tag: "p",
                            content: s(
                                "This book is a collaborative effort.  The following people have contributed to its creation:"
                            ),
                        }),
                        htmlLike({
                            tag: "contributors",
                            content: names.map((n) =>
                                htmlLike({
                                    tag: "contributor",
                                    content: [
                                        htmlLike({
                                            tag: "personname",
                                            content: [s(n.name)],
                                        }),
                                    ],
                                })
                            ),
                        }),
                    ],
                })
            );

            ast.content.unshift(
                htmlLike({ tag: "frontmatter", content: introContent })
            );
        };
    };

/**
 * Process `preface.tex` and put it in a format suitable for PreTeXt.
 */
function processPreface(ast: Ast.Root) {
    // The title page is in the preface inside of a `\begin{center}...` environment.
    // Remove it.
    replaceNode(ast, (node) => {
        if (match.environment(node, "center")) {
            return null;
        }
    });
    unified()
        .use(unifiedLatexProcessMacrosAndEnvironmentsWithMathReparse, {
            macros: {
                section: { signature: "s o m" },
                subsection: { signature: "s o m" },
            },
            environments: {},
        })
        .run(ast);

    // Pull out the title.
    let titleNode = htmlLike({ tag: "title", content: [] });
    replaceNode(ast, (node) => {
        if (match.macro(node, "section")) {
            titleNode = htmlLike({
                tag: "title",
                content: node.args?.[2].content || [],
            });
            return null;
        }
    });

    // `\subsection`s get mapped to `<paragraphs>`
    const split = splitOnMacro(ast.content, "subsection");
    // Wrap everything in pars as appropriate
    split.segments = split.segments.map((seg) => {
        return wrapPars(seg);
    });

    const content: Ast.Node[] = split.macros.map((macro, i) => {
        const title = htmlLike({
            tag: "title",
            content: macro.args?.[2].content || [],
        });
        return htmlLike({
            tag: "paragraphs",
            content: [title, ...split.segments[i + 1]],
        });
    });

    ast.content = [titleNode, ...content];
}
