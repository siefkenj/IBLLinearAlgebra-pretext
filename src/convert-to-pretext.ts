import { unified } from "unified";
import rehypeStringify from "rehype-stringify";
import chalk from "chalk";
import { readFile } from "node:fs/promises";
import path, { dirname } from "node:path";
import { writeFile } from "fs";

import {
    htmlLike,
    isHtmlLike,
} from "@unified-latex/unified-latex-util-html-like";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import {
    unifiedLatexToHast,
    wrapPars,
} from "@unified-latex/unified-latex-to-hast";
import {
    unifiedLatexAstComplier,
    unifiedLatexFromString,
} from "@unified-latex/unified-latex-util-parse";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";
import { replaceMath } from "./plugin-replace-math";
import { splitOnHeadings } from "./plugin-split-on-headings";
import {
    splitOnCondition,
    splitOnMacro,
    unsplitOnMacro,
} from "@unified-latex/unified-latex-util-split";
import { SP, m, s, arg } from "@unified-latex/unified-latex-builder";
import { Node } from "@unified-latex/unified-latex-types";
import { replaceDefinitions } from "./plugin-replace-definitions";
import { replaceIgnoredElements } from "./plugin-replace-ignored-elements";
import { replaceLabels } from "./plugin-replace-labels";
import * as Ast from "@unified-latex/unified-latex-types";
import { match, math } from "@unified-latex/unified-latex-util-match";
import { toString } from "@unified-latex/unified-latex-util-to-string";
import { pgfkeysArgToObject } from "@unified-latex/unified-latex-util-pgfkeys";

const CWD = dirname(new URL(import.meta.url).pathname);

export function convert(value: string, definitionsFile?: string) {
    const addedMacros = unified()
        .use(unifiedLatexFromString, {
            macros: {
                Heading: {
                    signature: "m",
                },
                footnote: {
                    signature: "m",
                },
                index: {
                    signature: "o m",
                },
                SavedDefinitionRender: {
                    signature: "m",
                },
                ref: {
                    signature: "m",
                },
                eqref: {
                    signature: "m",
                },
                label: {
                    signature: "m",
                },
                prob: {
                    signature: "o",
                },
                hefferon: {
                    signature: "o",
                },
            },
            environments: {
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
            },
        })
        .use(unifiedLatexAstComplier)
        .use(splitOnHeadings)
        .use(replaceDefinitions, definitionsFile || "")
        .use(replaceIgnoredElements)
        .use(replaceLabels);

    const afterReplacements = addedMacros.use(unifiedLatexToHast, {
        skipHtmlValidation: true,
        macroReplacements: {
            footnote: (node) => {
                const args = getArgsContent(node);
                const split = splitOnMacro(
                    args[0] as Ast.Node[],
                    "html-tag:idx"
                );
                if (split.macros.length === 0) {
                    return htmlLike({
                        tag: "fn",
                        content: args[0] || [],
                    });
                }

                const fn = htmlLike({
                    tag: "fn",
                    content: ([] as Ast.Node[]).concat(...split.segments),
                });

                return {
                    type: "root",
                    content: [fn].concat(split.macros),
                };
            },
            index: (node) => {
                const args = getArgsContent(node);
                const formattedArgs = args.flatMap((arg) => {
                    if (arg == null) {
                        return [];
                    } else {
                        return htmlLike({
                            tag: "h",
                            content: arg,
                        });
                    }
                });
                return htmlLike({
                    tag: "idx",
                    content: formattedArgs,
                });
            },
            includegraphics: (node) => {
                const args = getArgsContent(node);
                const path = printRaw(args[args.length - 1] || []).replace(
                    /\.pdf$/,
                    ".png"
                );
                return htmlLike({
                    tag: "img",
                    attributes: { src: path },
                });
            },
            emph: (node) => {
                const args = getArgsContent(node);
                return htmlLike({
                    tag: "em",
                    content: args[0] || [],
                });
            },
            textsc: (node) => {
                const args = getArgsContent(node)[0]?.flatMap((arg) => {
                    if (arg.type === "string") {
                        arg.content = arg.content.toUpperCase();
                    }
                    return arg;
                });
                return htmlLike({
                    tag: "em",
                    content: args,
                });
            },
            ref: (node) => {
                const args = getArgsContent(node) as Ast.Node[][];
                return htmlLike({
                    tag: "xref",
                    attributes: {
                        ref: toString(args[0]),
                        text: "global",
                    },
                });
            },
            textbf: (node) => {
                const args = getArgsContent(node);
                return htmlLike({
                    tag: "alert",
                    content: args[0] || [],
                });
            },
            textcolor: (node) => {
                const args = getArgsContent(node);
                return htmlLike({
                    tag: "alert",
                    content: args[2] || [],
                });
            },
            textsf: (node) => {
                const args = getArgsContent(node);
                return htmlLike({
                    tag: "em",
                    content: args[0] || [],
                });
            },
            textit: (node) => {
                const args = getArgsContent(node);
                return htmlLike({
                    tag: "em",
                    content: args[0] || [],
                });
            },
            textsl: (node) => {
                const args = getArgsContent(node);
                return htmlLike({
                    tag: "em",
                    content: args[0] || [],
                });
            },
            texttt: (node) => {
                const args = getArgsContent(node);
                return htmlLike({
                    tag: "em",
                    content: args[0] || [],
                });
            },
            textrm: (node) => {
                const args = getArgsContent(node);
                return htmlLike({
                    tag: "em",
                    content: args[0] || [],
                });
            },
            eqref: (node) => {
                const args = getArgsContent(node) as Ast.Node[][];
                return htmlLike({
                    tag: "xref",
                    attributes: {
                        ref: toString(args[0]),
                        text: "global",
                    },
                });
            },
            mbox: (node) => {
                const args = getArgsContent(node);
                return {
                    type: "root",
                    content: args[0] || [],
                };
            },
            hefferon: (node) => {
                const arg = getArgsContent(node)[0];
                const annotation = `Hefferon's Linear Algebra ${
                    arg == null ? "" : `(${toString(arg)})`
                }`;
                return {
                    type: "string",
                    content: annotation,
                };
            },
            // label: (node, info) => {
            //     const arg = (
            //         getArgsContent(node as Ast.Macro) as Ast.String[][]
            //     )[0][0].content;
            //     console.log("hello");
            //     replaceNode(info.parents[info.parents.length - 1], (node) => {
            //         if (node === info.parents[1]) {
            //             const htmlLikeInfo = extractFromHtmlLike(
            //                 info.parents[1] as Ast.Macro
            //             );
            //             return htmlLike({
            //                 tag: htmlLikeInfo.tag,
            //                 content: htmlLikeInfo.content,
            //                 attributes: {
            //                     "xml:id": arg,
            //                     ...htmlLikeInfo.attributes,
            //                 },
            //             });
            //         } else if (match.macro(node, "label")) {
            //             return null;
            //         }
            //     });
            //     return node;
            // },
        },
        environmentReplacements: {
            example: (node) => {
                let exampleContents = [];
                let solutionContents: Node[] = [];
                const attributes: { [k: string]: string } = {};

                if (node._renderInfo?.id !== undefined) {
                    attributes["xml:id"] = node._renderInfo.id as string;
                }

                // seperate by paragraphs
                let segments = splitOnCondition(
                    node.content,
                    match.parbreak
                ).segments;

                for (let i = 0; i < segments.length; i++) {
                    // wrap the first paragraph in statement tags
                    if (i === 0) {
                        exampleContents.push(
                            htmlLike({
                                tag: "statement",
                                content: htmlLike({
                                    tag: "p",
                                    content: segments[i],
                                }),
                            })
                        );

                        // put the rest in p tags for later
                    } else {
                        const segmentsSplit = splitOnCondition(
                            segments[i],
                            (node) => {
                                return isHtmlLike(node);
                            }
                        );
                        const formattedSegments =
                            segmentsSplit.segments.flatMap((segment) => {
                                return [wrapPars(segment)];
                            });
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
                let remarkContents = [];

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
                        return htmlLike({
                            tag: "mrow",
                            content: {
                                type: "string",
                                content: toString(row),
                            },
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
                    node.content.unshift(
                        node._renderInfo.extraMacro as Ast.Macro
                    );
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
                            alignSplit.macros[rows.indexOf(row) - 1]._renderInfo
                                ?.id !== undefined
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
                const firstItemArgs: Ast.Node[][] = getArgsContent(
                    items[0]
                ).flatMap((arg) => {
                    if (arg == null) {
                        return [];
                    }
                    return [arg];
                });
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
                        const segmentsSplit = splitOnCondition(
                            args[1],
                            (node) => {
                                return isHtmlLike(node);
                            }
                        );
                        const formattedSegments =
                            segmentsSplit.segments.flatMap((segment) => {
                                return [wrapPars(segment)];
                            });
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
                    const args: Ast.Node[][] = getArgsContent(item).flatMap(
                        (arg) => {
                            if (arg == null) {
                                return [];
                            }
                            return [arg];
                        }
                    );
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
                        const formattedSegments =
                            segmentsSplit.segments.flatMap((segment) => {
                                return [wrapPars(segment)];
                            });
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
                    const args: Ast.Node[][] = getArgsContent(item).flatMap(
                        (arg) => {
                            if (arg == null) {
                                return [];
                            }
                            return [arg];
                        }
                    );
                    const attributes: { [k: string]: string } = {};
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
                const pgfkeys = pgfkeysArgToObject(
                    (node.args as Ast.Argument[])[0]
                );

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
                        const formattedSegments =
                            separatorsSplit.segments.flatMap((segment) => {
                                return [wrapPars(segment)];
                            });
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
                const statement = htmlLike({
                    tag: "statement",
                    content: wrapPars(node.content),
                });
                if (
                    !(
                        Array.isArray(args) &&
                        args.every((item) => item === null)
                    )
                ) {
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
                if (
                    !(
                        Array.isArray(args) &&
                        args.every((item) => item === null)
                    )
                ) {
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
                const formattedSegments = segmentsSplit.segments.flatMap(
                    (segment) => {
                        return [wrapPars(segment)];
                    }
                );
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
                    ([] as Ast.Node[]).concat(
                        ...(getArgsContent(node) as Ast.Node[][])
                    )
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

                        // for (const node of cells[cellIdx + 1]) {
                        //     if (match.macro(node, "hline")) {
                        //         if (rowIdx == 0) {
                        //             tabularAttributes.top = "medium";
                        //         } else {
                        //             rowAttributes.bottom = "medium";
                        //         }
                        //         cell.splice(cell.indexOf(node), 1);
                        //     }
                        // }

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
            tikzpicture: (node) => {
                const imageAttributes: { [k: string]: string } = {};
                imageAttributes.width = "50%";

                // note that skipHtmlValidation must be true or else image tags will be replaced by img
                return htmlLike({
                    tag: "figure",
                    content: htmlLike({
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
                    }),
                });
            },
        },
    });
    const beforeTextSize = afterReplacements
        .use(replaceMath)
        .use(rehypeStringify, { voids: [] })
        .processSync(value).value as string;

    const beforeFill = beforeTextSize.replaceAll(/\\textsize{(.*?)}/g, "\\$1");
    const beforeFootnoteSize = beforeFill.replaceAll(
        /{,fill=(.*?)}/g,
        ",fill=$1"
    );
    const output = beforeFootnoteSize.replaceAll(
        /\\(footnotesize|small){(.*?)};/g,
        "{\\$1$2};"
    );
    return output;
}

function testConvert() {
    const source = `\\hefferon`;
    const converted = convert(source);
    process.stdout.write(
        chalk.green("Converted") +
            "\n\n" +
            source +
            "\n\n" +
            chalk.green("to") +
            "\n\n" +
            converted +
            "\n"
    );
}

async function testConvertFile() {
    let source = await readFile(
        path.join(CWD, "../book/modules/module2.tex"),
        // path.join(CWD, "../sample-files/small-tex.tex"),
        "utf-8"
    );
    const converted = convert(source);

    writeFile("sample-files/module2.xml", converted, (err) => {
        if (err) throw err;
    });

    // process.stdout.write(
    //     chalk.green("Converted") +
    //         "\n\n" +
    //         source +
    //         "\n\n" +
    //         chalk.green("to") +
    //         "\n\n" +
    //         converted +
    //         "\n"
    // );
}

function printHelp() {
    console.log("Usage: convert-to-pretext [options]");
    console.log("Options:");
    console.log("  -h, --help     Show this help");
    console.log("  -s             Run the converter on a small sample source");
    console.log("  -f             Run the converter on a larger file");
}

const command = process.argv[2];

let hasExecuted = false;

if (command === "-s") {
    hasExecuted = true;
    testConvert();
}
if (command === "-f") {
    hasExecuted = true;
    testConvertFile();
}

if (command === "-h" || command === "--help" || !hasExecuted) {
    printHelp();
}

// npx vite-node src/convert-to-pretext.ts -f
