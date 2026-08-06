import { describe, it, expect } from "vitest";
import { extractLatexImagePreamble } from "../convert-textbook";

const BEGIN = "%%% BEGIN LATEX-IMAGE PREAMBLE";
const END = "%%% END LATEX-IMAGE PREAMBLE";

describe("extractLatexImagePreamble", () => {
    it("leaves a source with no markers alone", () => {
        const source = "Some prose.\n\n\\begin{tikzpicture}\\end{tikzpicture}\n";
        expect(extractLatexImagePreamble(source)).toEqual({
            source,
            preamble: "",
        });
    });

    it("lifts a block out of the body", () => {
        const { source, preamble } = extractLatexImagePreamble(
            `Before.\n${BEGIN}\n\\newcommand{\\Foo}{bar}\n${END}\nAfter.\n`
        );
        expect(preamble).toEqual("\n\\newcommand{\\Foo}{bar}\n");
        expect(source).toEqual("Before.\n\nAfter.\n");
    });

    it("lifts every block, in the order they appear", () => {
        const { source, preamble } = extractLatexImagePreamble(
            `${BEGIN}\nfirst\n${END}\nbody\n${BEGIN}\nsecond\n${END}\n`
        );
        expect(preamble).toEqual("\nfirst\n\nsecond\n");
        expect(source).toEqual("\nbody\n\n");
    });

    it("keeps the markers' own indentation from mattering", () => {
        const { preamble } = extractLatexImagePreamble(
            `\t  ${BEGIN}  \n\\newcommand{\\Foo}{bar}\n  ${END}\t\n`
        );
        expect(preamble).toEqual("\n\\newcommand{\\Foo}{bar}\n");
    });

    it("carries `$` through untouched", () => {
        // `$&`, `$'`, "$`" and `$1` are replacement-string escapes for
        // String.prototype.replace. Tikz's calc syntax is full of `$`.
        const definition = "\\path ($(0,0)!1!-90:(45:1)$) coordinate (s); $& $' $` $1";
        const { preamble } = extractLatexImagePreamble(
            `${BEGIN}\n${definition}\n${END}\n`
        );
        expect(preamble).toEqual(`\n${definition}\n`);
    });

    it("refuses a BEGIN with no END", () => {
        expect(() =>
            extractLatexImagePreamble(`${BEGIN}\n\\newcommand{\\Foo}{bar}\n`)
        ).toThrow(/[Uu]npaired/);
    });

    it("refuses an END with no BEGIN", () => {
        expect(() =>
            extractLatexImagePreamble(`\\newcommand{\\Foo}{bar}\n${END}\n`)
        ).toThrow(/[Uu]npaired/);
    });

    it("refuses a second BEGIN that is never closed", () => {
        expect(() =>
            extractLatexImagePreamble(
                `${BEGIN}\nfirst\n${END}\nbody\n${BEGIN}\nsecond\n`
            )
        ).toThrow(/[Uu]npaired/);
    });
});
