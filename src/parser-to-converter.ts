import rehypeStringify from "rehype-stringify";
import { unifiedLatexToHast } from "@unified-latex/unified-latex-to-hast";
import { unifiedLatexProcessMacrosAndEnvironmentsWithMathReparse } from "@unified-latex/unified-latex-util-parse";
import { unifiedLatexTrimEnvironmentContents } from "@unified-latex/unified-latex-util-trim";
import { replaceMath } from "./plugin-replace-math";

import { replaceDefinitions } from "./plugin-replace-definitions";
import { replaceIgnoredElements } from "./plugin-replace-ignored-elements";
import { replaceLabels } from "./plugin-replace-labels";
import { replaceIndicesInMathMode } from "./plugin-replace-indices-in-math-mode";
import { stringifyTikzContent } from "./plugin-stringify-tikz-content";
import { removeIgnoredTags } from "./plugin-remove-ignored-tags";
import { replaceSetStar } from "./plugin-replace-set-star";
import { macroInfo, macroReplacements } from "./subs/macro-subs";
import {
    environmentInfo,
    environmentReplacements,
} from "./subs/environment-subs";
import {
    EnvInfoRecord,
    MacroInfoRecord,
    Root,
} from "@unified-latex/unified-latex-types";
import {
    macroInfo as ctanMacroInfo,
    environmentInfo as ctanEnvironmentInfo,
} from "@unified-latex/unified-latex-ctan";
import { pluginGroupIntroductionAndSections } from "./plugin-group-introduction";
import { Processor } from "unified";
import { pluginSplitPars } from "./plugin-split-pars";

/**
 * Take a unified parser (e.g., one that has been initialized `unified().use(unifiedLatexFromString)`) and
 * add all the conversion plugins to it.
 */
export function parserToConverter(
    processor: Processor<Root, Root, Root, void>,
    { defFileContents }: { defFileContents: string }
) {
    const allMacroInfo: MacroInfoRecord = Object.assign(
        {},
        ...Object.values(ctanMacroInfo),
        macroInfo
    );
    const allEnvInfo: EnvInfoRecord = Object.assign(
        {},
        ...Object.values(ctanEnvironmentInfo),
        environmentInfo
    );
    return (
        processor
            .use(unifiedLatexProcessMacrosAndEnvironmentsWithMathReparse, {
                macros: allMacroInfo,
                environments: allEnvInfo,
            })
            .use(unifiedLatexTrimEnvironmentContents)
            .use(pluginGroupIntroductionAndSections)
            .use(pluginSplitPars)
            .use(replaceDefinitions, defFileContents)
            .use(replaceLabels)
            .use(stringifyTikzContent)
            .use(replaceSetStar)
            .use(replaceIgnoredElements)
            .use(replaceIndicesInMathMode)
            //
            // HTML part of the conversion
            //
            .use(unifiedLatexToHast, {
                skipHtmlValidation: true,
                macroReplacements,
                environmentReplacements: {
                    ...environmentReplacements,
                    align: environmentReplacements["align"],
                    "align*": environmentReplacements["align*"],
                    "alignat*": environmentReplacements["alignat*"],
                    appendix: environmentReplacements["appendix"],
                    center: environmentReplacements["center"],
                    definition: environmentReplacements["definition"],
                    "dmath*": environmentReplacements["dmath*"],
                    emphbox: environmentReplacements["emphbox"],
                    enumerate: environmentReplacements["enumerate"],
                    "enumerate*": environmentReplacements["enumerate*"],
                    equation: environmentReplacements["equation"],
                    example: environmentReplacements["example"],
                    exercises: environmentReplacements["exercises"],
                    itemize: environmentReplacements["itemize"],
                    module: environmentReplacements["module"],
                    proof: environmentReplacements["proof"],
                    quote: environmentReplacements["quote"],
                    sortedlist: environmentReplacements["sortedlist"],
                    tabular: environmentReplacements["tabular"],
                    theorem: environmentReplacements["theorem"],
                    tikzpicture: environmentReplacements["tikzpicture"],
                },
            })
            //
            // Conversion to string
            //
            .use(replaceMath)
            .use(removeIgnoredTags)
            .use(rehypeStringify, { voids: [] })
    );
}
