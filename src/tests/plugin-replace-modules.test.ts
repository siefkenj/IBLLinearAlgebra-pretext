import { describe, it, expect } from "vitest";
import { convertTextbook, convert } from "../convert-to-pretext";

import path, { dirname } from "node:path";
import { readFileSync } from "fs";

const CWD = dirname(new URL(import.meta.url).pathname);

describe("plugin-replace-modules", () => {
    it("replaces input macros in module environment", () => {
        const file = path.join(CWD, "../../book/modules/module1.tex");

        expect(
            convertTextbook(
                "\\begin{module} \\input{modules/module1.tex} \\end{module}"
            )
        ).toEqual(
            `<chapter>${convert(
                readFileSync(file, { encoding: "utf8" })
            )}</chapter>`
        );
    });
});
