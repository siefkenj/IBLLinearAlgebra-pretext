import { readFile } from "node:fs/promises";
import path, { dirname } from "node:path";

import { describe, it, expect } from "vitest";
import { convert } from "../convert-to-pretext";

const CWD = dirname(new URL(import.meta.url).pathname);

// Read the LaTeX file that contains definitions.
const testFile = await readFile(
    path.join(CWD, "/test-definitions.tex"),
    "utf-8"
);

describe("plugin-replace-definitions", () => {
    it("replaces a simple defintion that contains only text", () => {
        expect(
            convert("\\SavedDefinitionRender{DefintionWithText}", testFile)
        ).toEqual(
            '<definition xml:id="DefintionWithText"><title>Definition With Only Text</title><statement><p>This is just a simple defintion with plain text.</p></statement></definition>'
        );
    });
    it("replaces a more complicated defintion that texts, macros and environments", () => {
        expect(
            convert(
                "\\SavedDefinitionRender{MoreComplicatedDefinition}",
                testFile
            )
        ).toEqual(
            '<definition xml:id="MoreComplicatedDefinition"><title>Defintion With Macros, Environments etc.</title><statement><p>This is a more complicated defintion with macros and environments. This is called <em>Russel’s Paradox</em><idx><h>Russel’s Paradox</h></idx>, <m>m=2(n-1)+1</m></p><p><me>\\Set{1,2,a,\\Set{-70,\\infty}, x}</me></p><p></p><p><md><mrow>x=m+1&#x26;=(2k+1)+1=2k+2</mrow><mrow>&#x26;=2(k+1)=2n,</mrow></md></p></statement></definition>'
        );
    });
});
