import { describe, it, expect } from "vitest";
import { convert } from "./sample-converter";

describe("plugin-replace-indeces-in-math-mode", () => {
    it("replace indeces found 'align*' environemnt", () => {
        // The <idx> elements are lifted out of the <mrow>s and into the
        // surrounding <p>: PreTeXt cannot number an <idx> that sits inside an
        // <mrow> of an (unnumbered) <md>, and reports it as a PTX:BUG.
        expect(
            convert(
                "\\begin{align*} row \\index{index} \\\\ row \\index{index} \\end{align*}"
            )
        ).toEqual(
            "<p><idx><h>index</h></idx><idx><h>index</h></idx><md><mrow>row </mrow><mrow> row </mrow></md></p>"
        );
    });
});
