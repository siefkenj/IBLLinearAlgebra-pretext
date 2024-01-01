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
                console.log(args);
                return htmlLike({
                    tag: "em",
                    content: args,
                });
            },
        },
        environmentReplacements: {
            example: (node) => {
                return htmlLike({
                    tag: "example",
                    content: htmlLike({
                        tag: "statement",
                        content: node.content,
                    }),
                });
            },
            emphbox: (node) => {
                return htmlLike({
                    tag: "remark",
                    content: htmlLike({
                        tag: "p",
                        content: node.content,
                    }),
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
                        console.log(separatorsSplit);
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
        },
    });

    const output = afterReplacements
        .use(replaceMath)
        .use(rehypeStringify)
        .processSync(value).value as string;

    return output;
}

function testConvert() {
    const source = `\\begin{exercises} \\begin{problist} \\prob exercise 1 \\begin{solution} this is a solution \\end{solution} \\prob exercise 2 \\end{problist} \\end{exercises}`;
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

// macros:
// hspace
// square brackets on index tag

// environments:
// emph box
// align

// Other:
// wrap <me> tags with <p> tags
// preserve & in the align environment (and other places) since the & converts into different characters in html
// p tags
// preserved definition render
