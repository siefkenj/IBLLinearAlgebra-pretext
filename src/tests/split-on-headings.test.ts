import { describe, it, expect } from "vitest";
import { convert } from "../split-on-headings";

describe("split-on-headings", () => {
    it("can replace latex heading macros with title tag inside section tag", () => {
        expect(convert("\\Heading{Sets}")).toEqual(
            "<section><title>Sets</title></section>"
        );
    });
    it("can wrap any plain text after a heading in p tags", () => {
        expect(convert("\\Heading{Sets} Hello World!")).toEqual(
            "<section><title>Sets</title><p>Hello World!</p></section>"
        );
    });
    it("handle multiple heading macros", () => {
        expect(convert("\\Heading{Title 1} \\Heading{Title 2} \\Heading{Title 3}")).toEqual(
            "<section><title>Title 1</title></section><section><title>Title 2</title></section><section><title>Title 3</title></section>"
        );
    });
    it("can wrap any plain text in between two heading in p tags inside the coresponding section tag", () => {
        expect(convert("\\Heading{Title 1} Text 1 \\Heading{Title 2} Text 2")).toEqual(
            "<section><title>Title 1</title><p>Text 1</p></section><section><title>Title 2</title><p>Text 2</p></section>"
        );
    });
    it("can replace other macros after headings", () => {
        expect(convert("\\Heading{Sets}  \n \\[\\Set{1,2,3}.\\]")).toEqual(
            "<section><title>Sets</title><div class=\"display-math\">\\Set{1,2,3}.</div></section>"
        );
    });
});