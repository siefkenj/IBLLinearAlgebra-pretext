import { printRaw, tools } from "latex-ast-parser";
import * as Ast from "latex-ast-parser/dist/src/libs/ast-types";
import { nodesToHtmlId } from "./utils";

const { tagLikeMacro, argContentsFromMacro } = tools;
/**
 * Returns a function that wrap the first arg of a macro
 * in a <span></span> tag with the specified attributes.
 */
function wrapInSpanFactory(
    attributes: Record<string, string>,
    tagName = "span"
) {
    return (node: Ast.Macro) =>
        tagLikeMacro({
            tag: tagName,
            content: node.args ? node.args[0].content : [],
            attributes: { ...attributes },
        });
}

/**
 * Returns a function that wraps the third argument of a macro in the specified
 * tag. The third argument is chosen because `\section*[foo]{Section}` commands
 * take three arguments.
 */
function createHeading(tag: string) {
    return (node: Ast.Macro) => {
        if (!node.args) {
            return tagLikeMacro({ tag });
        }
        const args = argContentsFromMacro(node);
        const id = nodesToHtmlId(args[0] || []);
        return tagLikeMacro({
            tag,
            content: args[0] || [],
            attributes: { id },
        });
    };
}

/**
 * Rules for replacing a macro with an html-like macro
 * that will render has html when printed.
 */
export const bookMacroReplacements: Record<
    string,
    (node: Ast.Macro) => Ast.Macro | Ast.String
> = {
    Heading: createHeading("h2"),
    hspace: () =>
        tagLikeMacro({ tag: "hspace", attributes: { class: "hspace" } }),
    hfill: () => tagLikeMacro({ tag: "hfill", attributes: { class: "hfill" } }),
};

const macroMatcher = tools.match.createMacroMatcher(bookMacroReplacements);

export function expandBookMacros(ast: Ast.Ast): Ast.Ast {
    return tools.ast.replaceNode(
        ast,
        (node) => {
            if (!tools.match.macro(node)) {
                return node;
            }
            const replacementFunc = bookMacroReplacements[node.content];
            if (!replacementFunc) {
                return node;
            }
            return replacementFunc(node);
        },
        (node, context) => macroMatcher(node) && context.inMathMode !== true
    );
}

export const bookEnvironmentReplacements: Record<
    string,
    (node: Ast.Environment) => Ast.Node
> = {
    emphbox: (node) => {
        const args = tools.argContentsFromMacro(node);
        let label: Ast.Node[] = [];
        if (args[0]) {
            label = [
                tools.tagLikeMacro({
                    tag: "span",
                    content: args[0],
                    attributes: { class: "emphbox-header" },
                }),
            ];
        }
        const body = tools.tagLikeMacro({
            tag: "div",
            content: label.concat(node.content),
            attributes: { class: "emphbox" },
        });
        return body;
    },
    example: (node) => {
        const header: Ast.Node = tools.tagLikeMacro({
            tag: "example-header",
            attributes: { class: "example-header" },
        });
        const content = tools.html.wrapPars(node.content);

        const body = tools.tagLikeMacro({
            tag: "div",
            content: [header as Ast.Node].concat(content),
            attributes: { class: "example" },
        });
        return body;
    },
    theorem: (node) => {
        const args = tools.argContentsFromMacro(node);
        let header: Ast.Node;
        if (args[0]) {
            header = tools.tagLikeMacro({
                tag: "theorem-header",
                attributes: { class: "named-theorem-header" },
                content: args[0] || [],
            });
        } else {
            header = tools.tagLikeMacro({
                tag: "theorem-header",
                attributes: { class: "theorem-header" },
                content: args[0] || [],
            });
        }
        const content = tools.html.wrapPars(node.content);

        const body = tools.tagLikeMacro({
            tag: "div",
            content: [header as Ast.Node].concat(content),
            attributes: { class: "theorem" },
        });
        return body;
    },
    proof: (node) => {
        const header: Ast.Node = tools.tagLikeMacro({
            tag: "proof-header",
            attributes: { class: "proof-header" },
            content: [],
        });
        const content = tools.html.wrapPars(node.content);

        const body = tools.tagLikeMacro({
            tag: "div",
            content: [header as Ast.Node].concat(content),
            attributes: { class: "proof" },
        });
        return body;
    },
    minipage: (node) => {
        return tools.tagLikeMacro({
            tag: "div",
            content: [
                tools.tagLikeMacro({
                    tag: "div",
                    content: node.content,
                    attributes: { class: "minipage-content" },
                }),
            ],
            attributes: { class: "minipage-surround" },
        });
    },
};

const environmentMatcher = tools.match.createEnvironmentMatcher(
    bookEnvironmentReplacements
);

export function expandBookEnvironments(ast: Ast.Ast): Ast.Ast {
    return tools.ast.replaceNode(
        ast,
        (node) => {
            if (!tools.match.environment(node)) {
                return node;
            }
            const replacementFunc =
                bookEnvironmentReplacements[printRaw(node.env)];
            if (!replacementFunc) {
                return node;
            }
            return replacementFunc(node);
        },
        environmentMatcher
    );
}

const environments = {
    emphbox: { signature: "o" },
};
const macros = {
    SavedDefinitionRender: { signature: "m" },
    Heading: { signature: "m" },
    Goal: { signature: "m" },
};

export const bookMacros = macros;
export const bookEnvironments = environments;
