import { Plugin } from "unified";
import { visit } from "unist-util-visit";
import * as Hast from "hast";

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

export const replaceMath: Plugin<[], Hast.Root, Hast.Root> =
    function replaceMath() {
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
