import { unified } from "unified";
import rehypeStringify from "rehype-stringify";
import chalk from "chalk";
import { readFile } from "node:fs/promises";
import path, { dirname } from "node:path";

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
            },
            environments: {
                emphbox: {
                    signature: "o m",
                },
                definition: {
                    signature: "o",
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
                return htmlLike({
                    tag: "fn",
                    content: args[0] || [],
                });
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
                        solutionContents.push(
                            htmlLike({
                                tag: "p",
                                content: segments[i],
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
                const split = splitOnMacro(node.content, "\\");
                const formattedSegments = split.segments.flatMap((segment) => {
                    if (segment == null) {
                        return [];
                    } else {
                        return htmlLike({
                            tag: "mrow",
                            content: segment,
                        });
                    }
                });
                return htmlLike({
                    tag: "p",
                    content: htmlLike({
                        tag: "md",
                        content: formattedSegments,
                    }),
                });
            },
            // For itemize, we are making an assumption that either all items have an argument or they don't.
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
                const items: Ast.Macro[] = node.content.flatMap((node) => {
                    if (match.macro(node, "item")) {
                        return node;
                    }
                    return [];
                });

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
                    tag: "defintion",
                    content: statement,
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
    const source = `\\begin{definition}[Linear Algebra] A \\emph{linear equation} in the variables $x_1,\\ldots,x_n$ is one that can be expressed \\end{definition}`;
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
        // path.join(CWD, "../book/modules/module1.tex"),
        path.join(CWD, "../src/small-tex.tex"),
        "utf-8"
    );
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
