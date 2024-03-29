import { Plugin } from "unified";
import * as Hast from "hast";
import { remove } from "unist-util-remove";
import { visit } from "unist-util-visit";

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
 * This plugin removes tags that are invalid in PreTeXt.
 */
export const removeIgnoredTags: Plugin<[], Hast.Root, Hast.Root> =
    function removeIgnoredTags() {
        return function (tree: Hast.Root & { data: undefined }) {
            remove(tree, (node: Hast.Node) => {
                return isHastElement(node) && node.tagName === "br";
            });

            visit(tree, isHastElement, function (node: Hast.Element) {
                if (
                    node.tagName == "span" &&
                    hasClass(node, "textsize-large")
                ) {
                    node.tagName = "alert";
                    node.properties.className = undefined;
                }
            });
        };
    };
