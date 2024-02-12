import { Plugin } from "unified";
import * as Hast from "hast";
import { remove } from "unist-util-remove";

/**
 * Check if an element is of type 'Hast.Element'.
 */
function isHastElement(elm: any): elm is Hast.Element {
    return elm && typeof elm === "object" && elm.type === "element";
}

/**
 * This plugin removes tags that are invalid in PreTeXt.
 */
export const removeIgnoredTags: Plugin<[], Hast.Root, Hast.Root> =
    function removeIgnoredTags() {
        return function (tree: Hast.Root) {
            remove(tree, (node: Hast.Node) => {
                return isHastElement(node) && node.tagName === "br";
            });
        };
    };
