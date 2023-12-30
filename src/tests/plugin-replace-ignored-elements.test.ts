import { describe, it, expect } from "vitest";
import { convert } from "../convert-to-pretext";

describe("plugin-replace-ignored-elemnts", () => {
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
