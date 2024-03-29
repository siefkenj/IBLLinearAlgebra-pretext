import { readFile } from "node:fs/promises";
import path, { dirname } from "node:path";

import { describe, it, expect } from "vitest";
import { convert } from "./sample-converter";

const CWD = dirname(new URL(import.meta.url).pathname);

// Read the LaTeX file that contains definitions.
const testFile = await readFile(
    path.join(CWD, "/test-definitions.tex"),
    "utf-8"
);

describe("plugin-replace-definitions", () => {
    it("replaces a simple definition that contains only text", () => {
        expect(
            convert("\\SavedDefinitionRender{DefinitionWithText}", testFile)
        ).toEqual(
            '<definition xml:id="DefinitionWithText"><title>Definition With Only Text</title><statement><p>This is just a simple definition with plain text.</p></statement></definition>'
        );
    });
    it("replaces a more complicated definition that texts, macros and environments", () => {
        expect(
            convert(
                "\\SavedDefinitionRender{MoreComplicatedDefinition}",
                testFile
            )
        ).toEqual(
            String.raw`<definition xml:id="MoreComplicatedDefinition"><title>Definition With Macros, Environments etc.</title><statement><p>This is a more complicated definition with macros and environments. This is called <em>Russel’s Paradox</em><idx><h>Russel’s Paradox</h></idx>, <m>m=2(n-1)+1</m></p><p><me>\Set{1,2,a,\Set{-70,\infty}, x}</me></p><p></p><p><md><mrow>x=m+1&#x26;=(2k+1)+1=2k+2</mrow><mrow>&#x26;=2(k+1)=2n,</mrow></md></p></statement></definition>`
        );
    });
});
