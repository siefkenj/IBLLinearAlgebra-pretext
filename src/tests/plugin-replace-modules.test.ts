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
                "\\begin{module} \\Title{Module Title}In this module you will learn\\begin{itemize}\\item Geometric and algebraic definitions of the dot product.\\item How dot products relate to the length of a vector and the angle between two vectors.\\item The \\emph{normal form} of lines, planes, and hyperplanes.\\end{itemize} \\input{modules/module1.tex} \\end{module}"
            )
        ).toEqual(
            `<chapter><title>Module Title</title><objectives><introduction><p>In this module you will learn</p></introduction><ul><li><p>Geometric and algebraic definitions of the dot product.</p></li><li><p>How dot products relate to the length of a vector and the angle between two vectors.</p></li><li><p>The <em>normal form</em> of lines, planes, and hyperplanes.</p></li></ul></objectives> ${convert(
                readFileSync(file, { encoding: "utf8" })
            )}</chapter>`
        );
    });
});
