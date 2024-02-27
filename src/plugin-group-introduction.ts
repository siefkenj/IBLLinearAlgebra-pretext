import { Plugin } from "unified";
import * as Ast from "@unified-latex/unified-latex-types";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { match } from "@unified-latex/unified-latex-util-match";
import { splitOnMacro } from "@unified-latex/unified-latex-util-split";

/**
 * Any content in a module/appendix that comes _before_ the first `\Heading` is part of the introduction.
 * to a module (i.e., it should not get a "section" number). These must be wrapped in an `<introduction>` tag.
 *
 * All items that are immediate children of a module/appendix that come between a `\Heading`, `\section`, or `\subsection`
 * are also grouped together in their own environments.
 */
export const pluginGroupIntroductionAndSections: Plugin<
    [],
    Ast.Root,
    Ast.Root
> = function pluginGroupIntroductionAndSections() {
    return function (ast: Ast.Root) {
        visit(
            ast,
            (node, info) => {
                // The `test` already ensures this is true, but Typescript doesn't know we have the right type.
                if (!match.anyEnvironment(node)) {
                    return;
                }
                // Search for the first `\Heading` in the environment
                const firstHeadingIdx = node.content.findIndex((n) =>
                    match.macro(n, "Heading")
                );
                if (firstHeadingIdx === -1) {
                    // No `\Heading` found. Nothing we can do.
                    return;
                }

                // Remove all the elements before the heading
                const introContent = node.content.splice(0, firstHeadingIdx);

                // We also need to grab the `\Title` node and any `\label` if they are included in the introduction.
                let titleIdx = introContent.findIndex((n) =>
                    match.macro(n, "Title")
                );
                let titleNode =
                    titleIdx !== -1 ? introContent.splice(titleIdx, 1) : [];

                let labelIdx = introContent.findIndex((n) =>
                    match.macro(n, "label")
                );
                let labelNode =
                    labelIdx !== -1 ? introContent.splice(labelIdx, 1) : [];

                //
                // Remove `\begin{exercises}...` environment
                //

                // Exercises should be at the same level as sections
                // We remove them from the tree and stick them back at the end.
                let exercises: Ast.Environment[] = [];
                node.content = node.content.filter((node) => {
                    if (match.environment(node, "exercises")) {
                        exercises.push(node);
                        return false;
                    }
                    return true;
                });

                // Put the contents between each `\Heading` in its own environment.
                splitToEnv(node.content, "Heading", "section");
                // There may be a `\subsubsection` somewhere in the content.
                node.content.filter(match.anyEnvironment).forEach((env) => {
                    splitToEnv(env.content, "subsubsection", "subsection");
                });

                if (introContent.length > 0) {
                    node.content.unshift({
                        type: "environment",
                        content: introContent,
                        env: "introduction",
                    });
                }
                node.content.unshift(...titleNode);
                node.content.unshift(...labelNode);

                // Put the exercises back
                node.content.push(...exercises);
            },
            {
                test: (node) =>
                    match.environment(node, "module") ||
                    match.environment(node, "appendix"),
            }
        );
    };
};

/**
 * Split `ast` into multiple environments based on the `macroToSplitOn` macro.
 * For example, if `macroToSplitOn` is `"Heading"`, and `envToCreate` is `"section"` the `ast` will be split into
 * multiple `section` environments based on th location of the `\Heading` macros.
 */
function splitToEnv(
    ast: Ast.Node[],
    macroToSplitOn: string,
    envToCreate: string
) {
    const split = splitOnMacro(ast, macroToSplitOn);
    const ret: Ast.Node[] = [
        ...split.segments[0],
        ...split.segments.slice(1).map((seg, i) => {
            const env: Ast.Environment = {
                type: "environment",
                content: seg,
                env: envToCreate,
                args: split.macros[i].args,
            };
            return env;
        }),
    ];

    // Replace the contents of `ast`.
    ast.length = 0;
    ast.push(...ret);
}
