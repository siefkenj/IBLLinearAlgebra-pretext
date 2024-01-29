import { Plugin } from "unified";
import { visit } from "unist-util-visit";
import * as Hast from "hast";

/**
 * Check if an element is of type 'Hast.Element'.
 */
function isHastElement(elm: any): elm is Hast.Element {
    return elm && typeof elm === "object" && elm.type === "element";
}

/**
 * Check if a HAST element has the input class name
 */
function hasClass(elm: Hast.Element, className: string): boolean {
    if (!isHastElement(elm)) {
        return false;
    }
    if (!Array.isArray(elm.properties.className)) {
        return false;
    }
    return elm.properties.className.includes(className);
}

/**
 * This plugin modifies a HAST tree by replacing '<div>...<\div>' tags that have class name "display-math" with '<me>...<\me>' tags
 * wrapped in '<p>...<\p>' tags, and '<span>...<\span>' tags that have class name "inline-math" with '<m>...<\m>' tags.
 */
export const replaceMath: Plugin<[], Hast.Root, Hast.Root> =
    function replaceMath() {
        return function (tree: Hast.Root & { data: undefined }) {
            // Visity every node that is a HAST element
            visit(tree, isHastElement, function (node: Hast.Element) {
                // Replace elements that have class name "inline-math" with '<m>...<\m>' tags.
                if (node.tagName === "span" && hasClass(node, "inline-math")) {
                    node.tagName = "m";
                    node.properties.className = undefined;
                }
                // Replace elements that have class name "display-math" with <me>...<\me>' tags
                // wrapped in '<p>...<\p>' tags.
                if (node.tagName === "div" && hasClass(node, "display-math")) {
                    node.tagName = "p";
                    node.properties.className = undefined;
                    // Create a HAST element with the children of the current node as its children.
                    const me: Hast.Element = {
                        type: "element",
                        tagName: "me",
                        children: node.children,
                        properties: {},
                    };
                    // Wrap everything in '<p>...<\p>' tags.
                    node.children = [me];
                }
            });
        };
    };
