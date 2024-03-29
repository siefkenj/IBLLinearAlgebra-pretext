import { describe, it, expect } from "vitest";
import { convert } from "./sample-converter";

describe("plugin-replace-indeces-in-math-mode", () => {
    it("replace indeces found 'align*' environemnt", () => {
        expect(
            convert(
                "\\begin{align*} row \\index{index} \\\\ row \\index{index} \\end{align*}"
            )
        ).toEqual(
            "<p><md><mrow><idx><h>index</h></idx>row </mrow><mrow><idx><h>index</h></idx> row </mrow></md></p>"
        );
    });
});
