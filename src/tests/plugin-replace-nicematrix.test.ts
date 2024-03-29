import { describe, it, expect } from "vitest";
import { convert } from "./sample-converter";

describe("plugin-replace-nicematrix", () => {
    it("replace ignored macros", () => {
        expect(convert("\\hfill")).toEqual("");
        expect(convert("\\smallskip")).toEqual("");
    });
    it("replaces ignored environments", () => {
        expect(convert("\\begin{minipage} \n\n foo \\end{minipage}")).toEqual(
            "foo"
        );
    });
});
