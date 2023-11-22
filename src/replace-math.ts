import { unified, Plugin } from "unified";
import rehypeStringify from "rehype-stringify";
import chalk from "chalk";
import { readFile } from "node:fs/promises";
import path, { dirname } from "node:path";

import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { unifiedLatexToHast } from "@unified-latex/unified-latex-to-hast";
import { unifiedLatexFromString } from "@unified-latex/unified-latex-util-parse";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";
import rehypeRemark from "rehype-remark";
import { toString as hastToString } from "hast-util-to-string";
import remarkStringify from "remark-stringify";
// import { visit } from "@unified-latex/unified-latex-util-visit";
import { visit } from "unist-util-visit";
import * as Hast from "hast";
import * as Ast from "@unified-latex/unified-latex-types";
import { toString } from "@unified-latex/unified-latex-util-to-string";



function isHastElement(elm: any): elm is Hast.Element {
    return elm && typeof elm === "object" && elm.type === "element";
}
function hasClass(elm: Hast.Element, className: string): boolean {
    if (!isHastElement(elm)) {
        return false;
    }
    if (!Array.isArray(elm.properties.className)) {
        return false;
    }
    return elm.properties.className.includes(className);
}

const replaceMath: Plugin<[], Hast.Root, Hast.Root> = function replaceMath() {
    return function (tree: Hast.Root & { data: undefined }) {
        visit(tree, isHastElement, function (node: Hast.Element) {
            if (node.tagName === "span" && hasClass(node, "inline-math")) {
                node.tagName = "m";
                node.properties.className = undefined;
            }

            if (node.tagName === "div" && hasClass(node, "display-math")) {
                node.tagName = "p";
                node.properties.className = undefined;
                const me: Hast.Element = {
                    type: "element",
                    tagName: "me",
                    children: node.children,
                    properties: {},
                };
                node.children = [me];
            }
        });
    };
};