import { describe, it, expect } from "vitest";
import { convert } from "../src/convert-to-pretext.ts";

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
        
     });
     it("replace example environment works", () => {
        pretext = convert("\\begin{example}foo\\end{example}") 
        expect(pretext).toEqual(
             '<example><statement>foo</statement></example>'
        );
     });
     it.todo("replace align* environment works", () => {
        
     });
     it.todo("replace emph box environment works", () => {
        
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
             '<me class=\"display-math\">x+y</me>'
        );
     });
     it.todo("paragraph splitting works", () => {

     });
})