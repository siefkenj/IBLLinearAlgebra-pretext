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
import { SP } from "@unified-latex/unified-latex-builder";
import { Node } from "@unified-latex/unified-latex-types";
import { replaceDefinitions } from "./plugin-replace-definitions";
import { replaceIgnoredElements } from "./plugin-replace-ignored-elements";
import * as Ast from "@unified-latex/unified-latex-types";
import { match, math } from "@unified-latex/unified-latex-util-match";
import { toString } from "@unified-latex/unified-latex-util-to-string";

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
            },
        })
        .use(unifiedLatexAstComplier)
        .use(splitOnHeadings)
        .use(replaceDefinitions, definitionsFile || "")
        .use(replaceIgnoredElements);

    const afterReplacements = addedMacros.use(unifiedLatexToHast, {
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
                    content: { type: "string", content: "*" },
                    attributes: {
                        ref: toString(args[0]),
                        text: "custom",
                    },
                });
            },
        },
        environmentReplacements: {
            example: (node) => {
                let exampleContents = [];
                let solutionContents: Node[] = [];

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

                // wrap the rest in solution tags
                exampleContents.push(
                    htmlLike({
                        tag: "solution",
                        content: solutionContents,
                    })
                );

                // wrap everything in example tags
                return htmlLike({
                    tag: "example",
                    content: exampleContents,
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
                            content: getArgsContent(items[0])[1] || [],
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
                        tag: "ol",
                        content,
                    }),
                });
            },
            exercises: (node) => {
                const problist = splitOnCondition(node.content, (node) => {
                    return match.environment(node, "problist");
                }).separators[0] as Ast.Environment;
                const probs = splitOnMacro(
                    problist.content,
                    "prob"
                ).segments.flatMap((prob) => {
                    if (prob.length == 0) return [];
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
                        });
                    }
                    return htmlLike({
                        tag: "exercise",
                        content: statement,
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
                return htmlLike({
                    tag: "p",
                    content: htmlLike({
                        tag: "men",
                        content: {
                            type: "string",
                            content: toString(node.content),
                        },
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
        },
    });

    const output = afterReplacements
        .use(replaceMath)
        .use(rehypeStringify)
        .processSync(value).value as string;

    return output;
}

function testConvert() {
    const source = `\\begin{tabular}{|c|c|}  \\end{tabular}`;
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
        path.join(CWD, "../book/modules/module1.tex"),
        // path.join(CWD, "../src/small-tex.tex"),
        "utf-8"
    );
    const converted = convert(source);

    writeFile("module.1.xml", converted, (err) => {
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

// environments:
// emph box

// Other:
// preserved definition render
