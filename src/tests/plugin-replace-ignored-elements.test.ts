import { describe, it, expect } from "vitest";
import { convert } from "../convert-to-pretext";

describe("plugin-replace-ignored-elements", () => {
    it("wraps math that contains NiceMatrix in tikz pictures", () => {
        expect(convert(String.raw`\[\begin{bNiceMatrix}x&y\end{bNiceMatrix}\]`))
            .toEqual(`<figure><caption></caption><image width="50%"><latex-image>\\begin{tikzpicture}
\t\\node{$\\begin{bNiceMatrix}
\tx &#x26; y
\\end{bNiceMatrix}$};
\\end{tikzpicture}</latex-image></image></figure>`);
    });
});
