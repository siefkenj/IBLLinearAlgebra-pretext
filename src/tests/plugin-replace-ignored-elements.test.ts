import { describe, it, expect } from "vitest";
import { convert } from "./sample-converter";

describe("plugin-replace-ignored-elements", () => {
    it("wraps math that contains NiceMatrix in tikz pictures", () => {
        expect(convert(String.raw`\[\begin{bNiceMatrix}x&y\end{bNiceMatrix}\]`))
            .toEqual(`<figure><caption></caption><image width="50%"><latex-image>\\begin{tikzpicture}
\t\\node{$\\begin{bNiceMatrix}
\tx &#x26; y
\\end{bNiceMatrix}$};
\\end{tikzpicture}</latex-image></image></figure>`);
    });

    it("keeps '\\#' escaped inside math but not in text", () => {
        // Math is passed through to MathJax as LaTeX, and PreTeXt rejects a
        // bare "#" inside \text{}.
        expect(convert(String.raw`$l(\text{\# nickels})=25$`)).toEqual(
            String.raw`<m>l(\text{\# nickels})=25</m>`
        );
        expect(convert(String.raw`a \# b`)).toEqual(`a # b`);
    });
});
