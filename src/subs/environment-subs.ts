import {
    htmlLike,
    isHtmlLike,
} from "@unified-latex/unified-latex-util-html-like";
import { wrapPars } from "@unified-latex/unified-latex-to-hast";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";
import {
    splitOnCondition,
    splitOnMacro,
    unsplitOnMacro,
} from "@unified-latex/unified-latex-util-split";
import { SP, s } from "@unified-latex/unified-latex-builder";
import { Node } from "@unified-latex/unified-latex-types";
import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { toString } from "@unified-latex/unified-latex-util-to-string";
import { pgfkeysArgToObject } from "@unified-latex/unified-latex-util-pgfkeys";
import { VisitInfo } from "@unified-latex/unified-latex-util-visit";

export const environmentInfo: Ast.EnvInfoRecord = {
    emphbox: {
        signature: "o m",
    },
    definition: {
        signature: "o",
    },
    theorem: {
        signature: "o",
    },
    tabular: {
        signature: "m",
    },
    equation: {
        renderInfo: {
            inMathMode: true,
        },
    },
    "alignat*": {
        signature: "m",
    },
    "dmath*": {
        renderInfo: {
            inMathMode: true,
        },
    },
};

export const environmentReplacements: Record<
    string,
    (
        node: Ast.Environment,
        info: VisitInfo
    ) => Ast.Macro | Ast.Environment | Ast.String
> = {
    example: (node) => {
        let exampleContents: Ast.Node[] = [];
        let solutionContents: Node[] = [];
        const attributes: { [k: string]: string } = {};

        if (node._renderInfo?.id !== undefined) {
            attributes["xml:id"] = node._renderInfo.id as string;
        }

        // seperate by paragraphs
        let segments = splitOnCondition(node.content, match.parbreak).segments;

        for (let i = 0; i < segments.length; i++) {
            // wrap the first paragraph in statement tags
            const segmentsSplit = splitOnCondition(segments[i], (node) => {
                return isHtmlLike(node) || match.parbreak(node);
            });
            const formattedSegments = segmentsSplit.segments.flatMap(
                (segment) => {
                    return [wrapPars(segment)];
                }
            );
            if (i === 0) {
                exampleContents.push(
                    htmlLike({
                        tag: "statement",
                        content: unsplitOnMacro({
                            segments: formattedSegments,
                            macros: segmentsSplit.separators,
                        }),
                    })
                );

                // put the rest in p tags for later
            } else {
                solutionContents.push(
                    ...unsplitOnMacro({
                        segments: formattedSegments,
                        macros: segmentsSplit.separators,
                    })
                );
            }
        }

        // wrap the rest in solution tags (if there is solution content)
        if (solutionContents.length != 0) {
            exampleContents.push(
                htmlLike({
                    tag: "solution",
                    content: solutionContents,
                })
            );
        }

        // wrap everything in example tags
        return htmlLike({
            tag: "example",
            content: exampleContents,
            attributes,
        });
    },
    emphbox: (node) => {
        const args: (Node[] | null)[] = getArgsContent(node);
        let remarkContents: Ast.Node[] = [];

        // check if there is the optional argument for title and wrap in title tags
        if (args[0] !== null) {
            remarkContents.push(
                htmlLike({
                    tag: "title",
                    content: args[0],
                })
            );
        }

        // args[1] has the first word of the text
        let text: Node[] = [];
        if (args[1] != null) {
            text = text.concat(args[1]);
        }

        // add white space between parts
        text.push(SP);

        // node.content has the rest of the text
        text = text.concat(node.content);

        remarkContents.push(
            htmlLike({
                tag: "p",
                content: text,
            })
        );

        return htmlLike({
            tag: "remark",
            content: remarkContents,
        });
    },
    "align*": (node) => {
        const rows = splitOnMacro(node.content, "\\").segments;
        const formattedRows = rows.flatMap((row) => {
            if (row == null) {
                return [];
            } else {
                const rowRoot = { type: "root", content: row };

                const content = rowRoot.content
                    .filter((node) => isHtmlLike(node))
                    .concat(rowRoot.content.filter((node) => !isHtmlLike(node)))
                    .flatMap((node) => {
                        if (isHtmlLike(node)) {
                            return node;
                        }

                        return s(toString(node));
                    });

                return htmlLike({
                    tag: "mrow",
                    content,
                });
            }
        });
        return htmlLike({
            tag: "p",
            content: htmlLike({
                tag: "md",
                content: formattedRows,
            }),
        });
    },
    "alignat*": (node) => {
        if (node._renderInfo?.extraMacro !== undefined) {
            node.content.unshift(node._renderInfo.extraMacro as Ast.Macro);
        }
        const alignSplit = splitOnMacro(node.content, "\\");
        const rows = alignSplit.segments;
        const formattedRows = rows.flatMap((row) => {
            if (row == null || row.length == 0) {
                return [];
            } else {
                const attributes: { [k: string]: string } = {};
                if (
                    rows.indexOf(row) !== 0 &&
                    alignSplit.macros[rows.indexOf(row) - 1]._renderInfo?.id !==
                        undefined
                ) {
                    attributes["xml:id"] = alignSplit.macros[
                        rows.indexOf(row) - 1
                    ]._renderInfo?.id as string;
                }
                return htmlLike({
                    tag: "mrow",
                    content: {
                        type: "string",
                        content: toString(row),
                    },
                    attributes,
                });
            }
        });
        return htmlLike({
            tag: "p",
            content: htmlLike({
                tag: "md",
                content: formattedRows,
            }),
        });
    },
    align: (node) => {
        if (node._renderInfo?.extraMacro !== undefined) {
            node.content.unshift(node._renderInfo.extraMacro as Ast.Macro);
        }
        const alignSplit = splitOnMacro(node.content, "\\");
        const rows = alignSplit.segments;
        const formattedRows = rows.flatMap((row) => {
            if (row == null || row.length == 0) {
                return [];
            } else {
                const attributes: { [k: string]: string } = {};
                if (
                    rows.indexOf(row) !== 0 &&
                    alignSplit.macros[rows.indexOf(row) - 1]._renderInfo?.id !==
                        undefined
                ) {
                    attributes["xml:id"] = alignSplit.macros[
                        rows.indexOf(row) - 1
                    ]._renderInfo?.id as string;
                }
                return htmlLike({
                    tag: "mrow",
                    content: {
                        type: "string",
                        content: toString(row),
                    },
                    attributes,
                });
            }
        });
        return htmlLike({
            tag: "p",
            content: htmlLike({
                tag: "mdn",
                content: formattedRows,
            }),
        });
    },
    // For itemize and enumerate, we are making an assumption that either all items have an argument or they alls` don't.
    itemize: (node) => {
        const items: Ast.Macro[] = node.content.flatMap((node) => {
            if (match.macro(node, "item")) {
                return node;
            }
            return [];
        });
        const firstItemArgs: Ast.Node[][] = getArgsContent(items[0]).flatMap(
            (arg) => {
                if (arg == null) {
                    return [];
                }
                return [arg];
            }
        );
        if (firstItemArgs.length >= 2) {
            const content = items.flatMap((item) => {
                const args: Ast.Node[][] = getArgsContent(item).flatMap(
                    (arg) => {
                        if (arg == null) {
                            return [];
                        }
                        return [arg];
                    }
                );
                const title = htmlLike({
                    tag: "title",
                    content: args[0],
                });
                const segmentsSplit = splitOnCondition(args[1], (node) => {
                    return isHtmlLike(node);
                });
                const formattedSegments = segmentsSplit.segments.flatMap(
                    (segment) => {
                        return [wrapPars(segment)];
                    }
                );
                const liContent = unsplitOnMacro({
                    segments: formattedSegments,
                    macros: segmentsSplit.separators,
                });
                liContent.unshift(title);
                return htmlLike({
                    tag: "li",
                    content: liContent,
                });
            });
            return htmlLike({
                tag: "p",
                content: htmlLike({
                    tag: "dl",
                    content,
                }),
            });
        }

        const content = items.flatMap((item) => {
            const args: Ast.Node[][] = getArgsContent(item).flatMap((arg) => {
                if (arg == null) {
                    return [];
                }
                return [arg];
            });
            const segmentsSplit = splitOnCondition(args[0], (node) => {
                return isHtmlLike(node);
            });
            const formattedSegments = segmentsSplit.segments.flatMap(
                (segment) => {
                    return [wrapPars(segment)];
                }
            );
            return htmlLike({
                tag: "li",
                content: unsplitOnMacro({
                    segments: formattedSegments,
                    macros: segmentsSplit.separators,
                }),
            });
        });

        return htmlLike({
            tag: "p",
            content: htmlLike({
                tag: "ul",
                content,
            }),
        });
    },
    enumerate: (node) => {
        // const items: Ast.Macro[] = node.content.flatMap((node) => {
        //     if (match.macro(node, "item")) {
        //         return node;
        //     }
        //     return [];
        // });
        const items = splitOnMacro(node.content, "item").macros;

        if (getArgsContent(items[0])[1] != null) {
            const content = items.flatMap((item) => {
                const fourthArg = getArgsContent(item)[3] as Ast.Node[];
                const args: Ast.Node[] = fourthArg.flatMap((arg) => {
                    if (arg == null) {
                        return [];
                    }
                    return [arg];
                });
                const segmentsSplit = splitOnCondition(args, (node) => {
                    return isHtmlLike(node);
                });
                const formattedSegments = segmentsSplit.segments.flatMap(
                    (segment) => {
                        return [wrapPars(segment)];
                    }
                );
                const liContent = unsplitOnMacro({
                    segments: formattedSegments,
                    macros: segmentsSplit.separators,
                });
                const title = htmlLike({
                    tag: "title",
                    content: getArgsContent(item)[1] || [],
                });
                liContent.unshift(title);
                return htmlLike({
                    tag: "li",
                    content: liContent,
                });
            });

            return htmlLike({
                tag: "p",
                content: htmlLike({
                    tag: "dl",
                    content,
                }),
            });
        }

        const content = items.flatMap((item) => {
            const args: Ast.Node[][] = getArgsContent(item).flatMap((arg) => {
                if (arg == null) {
                    return [];
                }
                return [arg];
            });
            const attributes: { [k: string]: string } = {};
            if (args[0] == undefined) {
                return htmlLike({
                    tag: "li",
                });
            }
            const segmentsSplit = splitOnCondition(args[0], (node) => {
                return isHtmlLike(node);
            });
            const formattedSegments = segmentsSplit.segments.flatMap(
                (segment) => {
                    return [wrapPars(segment)];
                }
            );

            if (item._renderInfo?.id != undefined) {
                attributes["xml:id"] = item._renderInfo?.id as string;
            }

            return htmlLike({
                tag: "li",
                content: unsplitOnMacro({
                    segments: formattedSegments,
                    macros: segmentsSplit.separators,
                }),
                attributes,
            });
        });

        const attributes: { [k: string]: string } = {};
        const pgfkeys = pgfkeysArgToObject((node.args as Ast.Argument[])[0]);

        if (
            pgfkeys.label != undefined &&
            pgfkeys.label.length > 1 &&
            (pgfkeys.label[1] as Ast.Macro).content == "roman"
        ) {
            attributes.marker = "i";
        }

        return htmlLike({
            tag: "p",
            content: htmlLike({
                tag: "ol",
                content,
                attributes,
            }),
        });
    },
    "enumerate*": (node) => {
        const items = splitOnMacro(node.content, "item").macros;

        if (getArgsContent(items[0])[1] != null) {
            const content = items.flatMap((item) => {
                const fourthArg = getArgsContent(item)[3] as Ast.Node[];
                const args: Ast.Node[] = fourthArg.flatMap((arg) => {
                    if (arg == null) {
                        return [];
                    }
                    return [arg];
                });
                const segmentsSplit = splitOnCondition(args, (node) => {
                    return isHtmlLike(node);
                });
                const formattedSegments = segmentsSplit.segments.flatMap(
                    (segment) => {
                        return [wrapPars(segment)];
                    }
                );
                const liContent = unsplitOnMacro({
                    segments: formattedSegments,
                    macros: segmentsSplit.separators,
                });
                const title = htmlLike({
                    tag: "title",
                    content: getArgsContent(item)[1] || [],
                });
                liContent.unshift(title);
                return htmlLike({
                    tag: "li",
                    content: liContent,
                });
            });

            return htmlLike({
                tag: "p",
                content: htmlLike({
                    tag: "dl",
                    content,
                }),
            });
        }

        const content = items.flatMap((item) => {
            const args: Ast.Node[][] = getArgsContent(item).flatMap((arg) => {
                if (arg == null) {
                    return [];
                }
                return [arg];
            });
            const attributes: { [k: string]: string } = {};
            if (args[0] == undefined) {
                return htmlLike({
                    tag: "li",
                });
            }
            const segmentsSplit = splitOnCondition(args[0], (node) => {
                return isHtmlLike(node);
            });
            const formattedSegments = segmentsSplit.segments.flatMap(
                (segment) => {
                    return [wrapPars(segment)];
                }
            );

            if (item._renderInfo?.id != undefined) {
                attributes["xml:id"] = item._renderInfo?.id as string;
            }

            return htmlLike({
                tag: "li",
                content: unsplitOnMacro({
                    segments: formattedSegments,
                    macros: segmentsSplit.separators,
                }),
                attributes,
            });
        });

        return htmlLike({
            tag: "p",
            content: htmlLike({
                tag: "ol",
                content,
            }),
        });
    },
    exercises: (node) => {
        const problist = splitOnCondition(node.content, (node) => {
            return match.environment(node, "problist");
        }).separators[0] as Ast.Environment;
        const probSplit = splitOnMacro(problist.content, "prob");
        const probs = probSplit.segments.flatMap((prob) => {
            if (prob.length == 0) return [];
            const attributes: { [k: string]: string } = {};
            const args = getArgsContent(
                probSplit.macros[probSplit.segments.indexOf(prob) - 1]
            );
            if (
                probSplit.macros[probSplit.segments.indexOf(prob) - 1]
                    ._renderInfo?.id !== undefined
            ) {
                attributes["xml:id"] = probSplit.macros[
                    probSplit.segments.indexOf(prob) - 1
                ]._renderInfo?.id as string;
            }
            if (args.length > 0 && args[0] != null) {
                const fn = htmlLike({
                    tag: "p",
                    content: htmlLike({
                        tag: "fn",
                        content: (args as Ast.Node[][])[0],
                    }),
                });
                prob.unshift(fn);
            }
            const solutionSplit = splitOnCondition(prob, (node) => {
                return match.environment(node, "solution");
            }) as {
                segments: Ast.Node[][];
                separators: Ast.Environment[];
            };
            const segmentsSplit = splitOnCondition(
                solutionSplit.segments[0],
                (node) => {
                    return isHtmlLike(node);
                }
            );
            const formattedSegments = segmentsSplit.segments.flatMap(
                (segment) => {
                    return [wrapPars(segment)];
                }
            );
            const statement = htmlLike({
                tag: "statement",
                content: unsplitOnMacro({
                    segments: formattedSegments,
                    macros: segmentsSplit.separators,
                }),
            });
            if (solutionSplit.separators.length > 0) {
                const separatorsSplit = splitOnCondition(
                    solutionSplit.separators[0].content,
                    (node) => {
                        return isHtmlLike(node);
                    }
                );
                const formattedSegments = separatorsSplit.segments.flatMap(
                    (segment) => {
                        return [wrapPars(segment)];
                    }
                );
                const solution = htmlLike({
                    tag: "solution",
                    content: unsplitOnMacro({
                        segments: formattedSegments,
                        macros: separatorsSplit.separators,
                    }),
                });
                return htmlLike({
                    tag: "exercise",
                    content: [statement, solution],
                    attributes,
                });
            }
            return htmlLike({
                tag: "exercise",
                content: statement,
                attributes,
            });
        });

        return htmlLike({
            tag: "exercises",
            content: probs,
        });
    },
    definition: (node) => {
        const args = getArgsContent(node);
        const segmentsSplit = splitOnCondition(node.content, (node) => {
            return isHtmlLike(node) || match.parbreak(node);
        });
        const formattedSegments = segmentsSplit.segments.flatMap((segment) => {
            return [wrapPars(segment)];
        });
        const statement = htmlLike({
            tag: "statement",
            content: unsplitOnMacro({
                segments: formattedSegments,
                macros: segmentsSplit.separators,
            }),
        });
        if (!(Array.isArray(args) && args.every((item) => item === null))) {
            const title = htmlLike({
                tag: "title",
                content: args[0] || undefined,
            });
            return htmlLike({
                tag: "definition",
                content: [title, statement],
            });
        }
        return htmlLike({
            tag: "definition",
            content: statement,
        });
    },
    equation: (node) => {
        const attributes: { [k: string]: string } = {};
        if (node._renderInfo?.id != undefined) {
            attributes["xml:id"] = node._renderInfo?.id as string;
        }
        return htmlLike({
            tag: "p",
            content: htmlLike({
                tag: "men",
                content: {
                    type: "string",
                    content: toString(node.content),
                },
                attributes,
            }),
        });
    },
    theorem: (node) => {
        const args = getArgsContent(node);
        const statement = htmlLike({
            tag: "statement",
            content: wrapPars(node.content),
        });
        if (!(Array.isArray(args) && args.every((item) => item === null))) {
            const title = htmlLike({
                tag: "title",
                content: args[0] || undefined,
            });
            return htmlLike({
                tag: "theorem",
                content: [title, statement],
            });
        }
        return htmlLike({
            tag: "theorem",
            content: statement,
        });
    },
    proof: (node) => {
        const segmentsSplit = splitOnCondition(node.content, (node) => {
            return isHtmlLike(node);
        });
        const formattedSegments = segmentsSplit.segments.flatMap((segment) => {
            return [wrapPars(segment)];
        });
        return htmlLike({
            tag: "proof",
            content: unsplitOnMacro({
                segments: formattedSegments,
                macros: segmentsSplit.separators,
            }),
        });
    },
    tabular: (node) => {
        const args = toString(
            ([] as Ast.Node[]).concat(...(getArgsContent(node) as Ast.Node[][]))
        ).split(/(?=[| ])|(?<=[| ])/g);
        if (args[0] != "|") {
            args.unshift(" ");
        }
        if (args[args.length - 1] != "|") {
            args.push(" ");
        }
        const borderArgs: string[] = [];
        const alignArgs: string[] = [];
        for (let i = 0; i < args.length; i++) {
            if (i % 2 == 0) {
                borderArgs.push(args[i]);
            } else {
                alignArgs.push(args[i]);
            }
        }

        const tabularAttributes: { [k: string]: string } = {};
        const rows = splitOnMacro(node.content, "\\").segments;

        const formattedRows = rows.flatMap((row) => {
            const rowIdx = rows.indexOf(row);
            const rowAttributes: { [k: string]: string } = {};

            const cells = splitOnCondition(row, (node) => {
                return match.string(node, "&");
            }).segments;
            const formattedCells = cells.flatMap((cell) => {
                const cellIdx = cells.indexOf(cell);
                const cellAttributes: { [k: string]: string } = {};

                if (rowIdx == 0) {
                    for (const node of cell) {
                        if (match.macro(node, "hline")) {
                            tabularAttributes.top = "medium";
                            cell.splice(cell.indexOf(node), 1);
                        }
                    }
                }
                if (rowIdx + 1 < rows.length) {
                    for (const node of rows[rowIdx + 1]) {
                        if (match.macro(node, "hline")) {
                            rowAttributes.bottom = "medium";
                            rows[rowIdx + 1].splice(
                                rows[rowIdx + 1].indexOf(node),
                                1
                            );
                        }
                    }
                }

                if (alignArgs.length > cellIdx) {
                    switch (alignArgs[cellIdx]) {
                        case "c":
                            cellAttributes.halign = "center";
                            break;
                        case "r":
                            cellAttributes.halign = "right";
                            break;
                        case "l":
                            cellAttributes.halign = "left";
                            break;
                        default:
                            break;
                    }
                }

                if (
                    borderArgs.length - 1 > cellIdx &&
                    borderArgs[cellIdx + 1] === "|"
                ) {
                    cellAttributes.right = "medium";
                }

                return htmlLike({
                    tag: "cell",
                    content: cell,
                    attributes: cellAttributes,
                });
            });
            if (
                (rowIdx == rows.length - 1 || rowIdx == 0) &&
                row.length == 1 &&
                row[0].type === "whitespace"
            ) {
                return [];
            }
            if (borderArgs[0] === "|") {
                rowAttributes.left = "medium";
            }
            return htmlLike({
                tag: "row",
                content: formattedCells,
                attributes: rowAttributes,
            });
        });
        return htmlLike({
            tag: "tabular",
            content: formattedRows,
            attributes: tabularAttributes,
        });
    },
    module: (node) => {
        const attributes: { [k: string]: string } = {};

        if (node._renderInfo?.id !== undefined) {
            attributes["xml:id"] = node._renderInfo.id as string;
        }
        const split = splitOnMacro(node.content, ["Title", "html-tag:p"]);

        const title = split.macros[0];

        const objectivesIntroduction = htmlLike({
            tag: "introduction",
            content: wrapPars(split.segments[1]),
        });

        const objectives = htmlLike({
            tag: "objectives",
            content: [
                objectivesIntroduction,
                (getArgsContent(split.macros[1])[0] as Ast.Macro[])[0],
            ],
        });

        const introduction = splitOnMacro(node.content, "html-tag:introduction")
            .macros[0];

        return htmlLike({
            tag: "chapter",
            content: [title, objectives, ...split.segments[2]],
            attributes,
        });
    },
    appendix: (node) => {
        const attributes: { [k: string]: string } = {};

        if (node._renderInfo?.id !== undefined) {
            attributes["xml:id"] = node._renderInfo.id as string;
        }
        const split = splitOnMacro(node.content, ["Title", "html-tag:p"]);

        const title = split.macros[0];

        const objectivesIntroduction = htmlLike({
            tag: "introduction",
            content: wrapPars(split.segments[1]),
        });

        const objectives = htmlLike({
            tag: "objectives",
            content: [
                objectivesIntroduction,
                (getArgsContent(split.macros[1])[0] as Ast.Macro[])[0],
            ],
        });

        const introduction = splitOnMacro(node.content, "html-tag:introduction")
            .macros[0];

        return htmlLike({
            tag: "appendix",
            content: [title, objectives, ...split.segments[2]],
            attributes,
        });
    },
    tikzpicture: (node) => {
        const imageAttributes: { [k: string]: string } = {};
        imageAttributes.width = "50%";

        const caption = htmlLike({
            tag: "caption",
        });

        const image = htmlLike({
            tag: "image",
            content: htmlLike({
                tag: "latex-image",
                content: s(
                    "\\begin{tikzpicture}" +
                        toString(node.content) +
                        "\\end{tikzpicture}"
                ),
            }),
            attributes: imageAttributes,
        });

        // note that skipHtmlValidation must be true or else image tags will be replaced by img
        return htmlLike({
            tag: "figure",
            content: [caption, image],
        });
    },
    center: (node) => {
        if (
            node._renderInfo?.hasTikzpictures !== undefined &&
            node._renderInfo.hasTikzpictures
        ) {
            return htmlLike({
                tag: "sidebyside",
                content: node.content,
            });
        }

        for (let el of node.content) {
            if (match.macro(el, "footnote")) {
                node.content.splice(node.content.indexOf(el));
                const caption = htmlLike({
                    tag: "caption",
                    content: (getArgsContent(el) as Ast.Node[][])[0],
                });

                return htmlLike({
                    tag: "figure",
                    content: [caption, ...node.content],
                });
            }
        }

        return node;
    },
    "dmath*": (node) => {
        return htmlLike({
            tag: "p",
            content: htmlLike({
                tag: "me",
                content: s(toString(node.content)),
            }),
        });
    },
    quote: (node) => {
        return htmlLike({
            tag: "blockquote",
            content: htmlLike({
                tag: "p",
                content: node.content,
            }),
        });
    },
    sortedlist: (node) => {
        const names = node.content
            .filter((node) => match.macro(node, "sortitem"))
            .sort((a, b) =>
                toString(
                    getArgsContent(a as Ast.Macro)[0] as Ast.Ast
                ).localeCompare(
                    toString(getArgsContent(b as Ast.Macro)[0] as Ast.Ast)
                )
            )
            .flatMap((node) => {
                const name = getArgsContent(node as Ast.Macro)[1];

                return htmlLike({
                    tag: "contributor",
                    content: htmlLike({
                        tag: "personname",
                        content: name || [],
                    }),
                });
            });

        return htmlLike({
            tag: "contributors",
            content: names,
        });
    },
};
