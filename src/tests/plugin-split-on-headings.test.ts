import { describe, it, expect } from "vitest";
import { convert } from "../convert-to-pretext";

describe("plugin-split-on-headings", () => {
    it("can replace latex heading macros with title tag inside section tag", () => {
        expect(convert("\\begin{module}\\Heading{Sets}\\end{module}")).toEqual(
            "<chapter><section> <title>Sets</title> </section></chapter>"
        );
    });
    it("can wrap any plain text after a heading in p tags", () => {
        expect(
            convert("\\begin{module}\\Heading{Sets} Hello World!\\end{module}")
        ).toEqual(
            "<chapter><section> <title>Sets</title><p>Hello World!</p> </section></chapter>"
        );
    });
    it("handle multiple heading macros", () => {
        expect(
            convert(
                "\\begin{module}\\Heading{Title 1} \\Heading{Title 2} \\Heading{Title 3}\\end{module}"
            )
        ).toEqual(
            "<chapter><section> <title>Title 1</title> </section><section> <title>Title 2</title> </section><section> <title>Title 3</title> </section></chapter>"
        );
    });
    it("can wrap any plain text in between two heading in p tags inside the corresponding section tag", () => {
        expect(
            convert(
                "\\begin{module}\\Heading{Title 1} Text 1 \\Heading{Title 2} Text 2\\end{module}"
            )
        ).toEqual(
            "<chapter><section> <title>Title 1</title><p>Text 1</p> </section><section> <title>Title 2</title><p>Text 2</p> </section></chapter>"
        );
    });
    it("can replace other macros after headings", () => {
        expect(
            convert(
                "\\begin{module}\\Heading{Sets}  \n \\[\\Set{1,2,3}.\\]\\end{module}"
            )
        ).toEqual(
            "<chapter><section> <title>Sets</title><p><me>\\Set{1,2,3}.</me></p> </section></chapter>"
        );
    });
    it("Keeps exercises at the same level as <sections>", () => {
        expect(
            convert(
                "\\begin{module}\\Heading{Sets} hi \\begin{exercises} there \\end{exercises} \\end{module}"
            )
        ).toEqual(
            "<chapter><section> <title>Sets</title><p>hi</p> </section><exercises>there</exercises></chapter>"
        );
    })
});
