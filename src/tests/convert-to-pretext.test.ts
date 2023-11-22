import { describe, it, expect } from "vitest";
import { convert } from "../convert-to-pretext"

describe("convert-to-pretext", () => {
    let pretext: string;
    it("replace Heading works", () => {
       pretext = convert("\\Heading{Sets}") 
       expect(pretext).toEqual(
            '<title>Sets</title>'
       );
    });
    it("replace footnote works", () => {
        pretext = convert("\\footnote{foo}") 
        expect(pretext).toEqual(
             '<fn>foo</fn>'
        );
     });
     it("replace index works", () => {
        pretext = convert("\\index{foo}") 
        expect(pretext).toEqual(
             '<idx><h>foo</h></idx>'
        );
     });
     it.todo("replace index with square brackets works", () => {
        
     });
     it.todo("replace hspace works", () => {
        // rarely used in the textbook, and can be difficult due to variety of unit options; skip for now
     });
     it("replace example environment works", () => {
        pretext = convert("\\begin{example}foo\\end{example}") 
        expect(pretext).toEqual(
             '<example><statement>foo</statement></example>'
        );
     });
     it.todo("replace align* environment works", () => {
        
     });
     it("replace emph box environment works", () => {
        pretext = convert("\\begin{emphbox}[Takeaway]\nA vector is not the same as a line segment.\n\\end{emphbox}")
        expect(pretext).toEqual(
          '<remark><p>[Takeaway] A vector is not the same as a line segment.</p></remark>'
        )
     });
     it("replace inline math works", () => {
        pretext = convert("$x+y$") 
        expect(pretext).toEqual(
             '<m class=\"inline-math\">x+y</m>'
        );
     });
     it("replace display math works", () => {
        pretext = convert("\\[x+y\\]") 
        expect(pretext).toEqual(
             '<p><me>x+y</me></p>'
        );
     });
})