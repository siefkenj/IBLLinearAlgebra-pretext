import { describe, it, expect } from "vitest";
import { convert } from "./sample-converter";

/**
 * Pull the latex source back out of the `latex-image` the converter wraps a
 * tikzpicture in.
 */
function latexImage(pretext: string): string {
    const match = pretext.match(/<latex-image>([\s\S]*)<\/latex-image>/);
    if (!match) {
        throw new Error(`No latex-image in ${pretext}`);
    }
    return match[1];
}

describe("plugin-stringify-tikz-content", () => {
    it("keeps the picture's own arguments", () => {
        // `\begin{tikzpicture}[x=1pt,y=-13pt]` draws a different picture from
        // `\begin{tikzpicture}`, so dropping the option list is not cosmetic.
        expect(
            latexImage(
                convert(
                    "\\begin{tikzpicture}[x=1pt,y=-13pt]\\draw (0,0) -- (1,1);\\end{tikzpicture}"
                )
            )
        ).toContain("\\begin{tikzpicture}[x=1pt,y=-13pt]");
    });

    it("passes an argument list through as source, not as latex to convert", () => {
        // The option list is tikz source. Nothing in it should be rewritten,
        // and a macro in it has to survive to the standalone compile.
        const image = latexImage(
            convert(
                "\\begin{tikzpicture}[x=\\EVunit,y=\\EVunit,>=latex]\\draw (0,0) -- (1,1);\\end{tikzpicture}"
            )
        );
        expect(image).toContain("[x=\\EVunit,y=\\EVunit,>=latex]");
    });

    it("leaves a picture with no arguments without an empty option list", () => {
        const image = latexImage(
            convert("\\begin{tikzpicture}\\draw (0,0) -- (1,1);\\end{tikzpicture}")
        );
        expect(image).toContain("\\begin{tikzpicture}\n");
        expect(image).not.toContain("[");
    });

    it("drops baseline, which has nothing to align to and breaks scaling", () => {
        // pretext scales each latex-image with `\resizebox{\width}{\height}`.
        // `baseline=(current bounding box.north)` leaves the picture with zero
        // height, so that scale factor is a division by zero.
        const image = latexImage(
            convert(
                "\\begin{tikzpicture}[baseline = (current bounding box.north)]\\draw (0,0) -- (1,1);\\end{tikzpicture}"
            )
        );
        expect(image).not.toContain("baseline");
        expect(image).toContain("\\begin{tikzpicture}");
    });

    it("keeps the other options when dropping baseline", () => {
        const image = latexImage(
            convert(
                "\\begin{tikzpicture}[scale=2, baseline=(a.north), x=1pt]\\draw (0,0) -- (1,1);\\end{tikzpicture}"
            )
        );
        expect(image).not.toContain("baseline");
        expect(image).toContain("scale=2");
        expect(image).toContain("x=1pt");
    });

    it("does not mistake another key for baseline", () => {
        const image = latexImage(
            convert(
                "\\begin{tikzpicture}[baselineshift=2pt]\\draw (0,0) -- (1,1);\\end{tikzpicture}"
            )
        );
        expect(image).toContain("baselineshift=2pt");
    });

    it("keeps the body verbatim", () => {
        const image = latexImage(
            convert(
                "\\begin{tikzpicture}\\foreach \\a/\\c in {0/red, 90/blue}{\\draw[\\c,->] (0,0) -- (\\a:1);}\\end{tikzpicture}"
            )
        );
        expect(image).toContain(
            "\\foreach \\a/\\c in {0/red, 90/blue}{\\draw[\\c,->] (0,0) -- (\\a:1);}"
        );
    });
});
