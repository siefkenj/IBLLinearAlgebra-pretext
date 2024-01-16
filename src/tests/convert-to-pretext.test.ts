import { describe, it, expect } from "vitest";
import { convert } from "../convert-to-pretext";

describe("convert-to-pretext", () => {
    let pretext: string;
    it("replaces emph", () => {
        pretext = convert("\\emph{foo}");
        expect(pretext).toEqual("<em>foo</em>");
    });
    it("replaces footnote", () => {
        pretext = convert("\\footnote{foo}");
        expect(pretext).toEqual("<fn>foo</fn>");

        pretext = convert("\\footnote{foo \\index{bar}}");
        expect(pretext).toEqual("<fn>foo </fn><idx><h>bar</h></idx>");
    });
    it("replaces index", () => {
        pretext = convert("\\index{foo}");
        expect(pretext).toEqual("<idx><h>foo</h></idx>");
    });
    it("replaces ref", () => {
        pretext = convert("\\ref{reference}");
        expect(pretext).toEqual('<xref ref="reference" text="custom">*</xref>');
    });
    it("replaces index with optional square brackets", () => {
        pretext = convert("The symbol\\index[symbols]{foo}is used");
        expect(pretext).toEqual(
            "The symbol<idx><h>symbols</h><h>foo</h></idx>is used"
        );
    });
    it("replaces the example environment", () => {
        pretext = convert(
            "\\begin{example}\nfoo\n\nbar1\n\nbar2\\end{example}"
        );
        expect(pretext).toEqual(
            "<example><statement><p>foo</p></statement><solution><p>bar1</p><p>bar2</p></solution></example>"
        );
    });
    it("replaces align and align* environments", () => {
        pretext = convert(
            "Thus \\begin{align*}x=m+1&=(2k+1)+1=2k+2\\\\&=2(k+1)=2n,\\end{align*}\n\nwhere"
        );
        expect(pretext).toEqual(
            "<p>Thus</p><p><md><mrow>x=m+1&#x26;=(2k+1)+1=2k+2</mrow><mrow>&#x26;=2(k+1)=2n,</mrow></md></p><p>where</p>"
        );

        pretext = convert(
            "Thus \\begin{align}x=m+1&=(2k+1)+1=2k+2\\\\&=2(k+1)=2n,\\end{align}\n\nwhere"
        );
        expect(pretext).toEqual(
            "<p>Thus</p><p><md><mrow>x=m+1&#x26;=(2k+1)+1=2k+2</mrow><mrow>&#x26;=2(k+1)=2n,</mrow></md></p><p>where</p>"
        );
    });
    it("replaces tabular environment", () => {
        //1x1
        pretext = convert("\\begin{tabular}{}  r1c1  \\end{tabular}");
        expect(pretext).toEqual(
            "<tabular><row><cell>r1c1</cell></row></tabular>"
        );

        //1x2
        pretext = convert("\\begin{tabular}{}  r1c1 & r1c2  \\end{tabular}");
        expect(pretext).toEqual(
            "<tabular><row><cell>r1c1 </cell><cell> r1c2</cell></row></tabular>"
        );

        //2x1
        pretext = convert("\\begin{tabular}{}  r1c1 \\\\ r2c1  \\end{tabular}");
        expect(pretext).toEqual(
            "<tabular><row><cell>r1c1 </cell></row><row><cell> r2c1</cell></row></tabular>"
        );

        //2x2
        pretext = convert(
            "\\begin{tabular}{}  r1c1 & r1c2 \\\\ r2c1 & r2c2  \\end{tabular}"
        );
        expect(pretext).toEqual(
            "<tabular><row><cell>r1c1 </cell><cell> r1c2 </cell></row><row><cell> r2c1 </cell><cell> r2c2</cell></row></tabular>"
        );

        //3x3
        pretext = convert(
            "\\begin{tabular}{}  r1c1 & r1c2 & r1c3 \\\\ r2c1 & r2c2 & r1c3 \\\\ r3c1 & r3c2 & r3c3  \\end{tabular}"
        );
        expect(pretext).toEqual(
            "<tabular><row><cell>r1c1 </cell><cell> r1c2 </cell><cell> r1c3 </cell></row><row><cell> r2c1 </cell><cell> r2c2 </cell><cell> r1c3 </cell></row><row><cell> r3c1 </cell><cell> r3c2 </cell><cell> r3c3</cell></row></tabular>"
        );

        // align and border arguments
        pretext = convert(
            "\\begin{tabular}{|c|r|l|}  r1c1 & r1c2 & r1c3 \\\\ r2c1 & r2c2 & r1c3 \\\\ r3c1 & r3c2 & r3c3  \\end{tabular}"
        );
        expect(pretext).toEqual(
            '<tabular><row left="medium"><cell halign="center" right="medium">r1c1 </cell><cell halign="right" right="medium"> r1c2 </cell><cell halign="left" right="medium"> r1c3 </cell></row><row left="medium"><cell halign="center" right="medium"> r2c1 </cell><cell halign="right" right="medium"> r2c2 </cell><cell halign="left" right="medium"> r1c3 </cell></row><row left="medium"><cell halign="center" right="medium"> r3c1 </cell><cell halign="right" right="medium"> r3c2 </cell><cell halign="left" right="medium"> r3c3</cell></row></tabular>'
        );

        pretext = convert(
            "\\begin{tabular}{c r l}  r1c1 & r1c2 & r1c3 \\\\ r2c1 & r2c2 & r1c3 \\\\ r3c1 & r3c2 & r3c3  \\end{tabular}"
        );
        expect(pretext).toEqual(
            '<tabular><row><cell halign="center">r1c1 </cell><cell halign="right"> r1c2 </cell><cell halign="left"> r1c3 </cell></row><row><cell halign="center"> r2c1 </cell><cell halign="right"> r2c2 </cell><cell halign="left"> r1c3 </cell></row><row><cell halign="center"> r3c1 </cell><cell halign="right"> r3c2 </cell><cell halign="left"> r3c3</cell></row></tabular>'
        );

        pretext = convert(
            "\\begin{tabular}{|c c}  r1c1 & r1c2 \\\\ r2c1 & r2c2 \\end{tabular}"
        );
        expect(pretext).toEqual(
            '<tabular><row left="medium"><cell halign="center">r1c1 </cell><cell halign="center"> r1c2 </cell></row><row left="medium"><cell halign="center"> r2c1 </cell><cell halign="center"> r2c2</cell></row></tabular>'
        );

        pretext = convert(
            "\\begin{tabular}{c c|}  r1c1 & r1c2 \\\\ r2c1 & r2c2 \\end{tabular}"
        );
        expect(pretext).toEqual(
            '<tabular><row><cell halign="center">r1c1 </cell><cell halign="center" right="medium"> r1c2 </cell></row><row><cell halign="center"> r2c1 </cell><cell halign="center" right="medium"> r2c2</cell></row></tabular>'
        );

        pretext = convert(
            "\\begin{tabular}{c|c}  r1c1 & r1c2 \\\\ r2c1 & r2c2 \\end{tabular}"
        );
        expect(pretext).toEqual(
            '<tabular><row><cell halign="center" right="medium">r1c1 </cell><cell halign="center"> r1c2 </cell></row><row><cell halign="center" right="medium"> r2c1 </cell><cell halign="center"> r2c2</cell></row></tabular>'
        );

        // horizontal lines
        pretext = convert(
            "\\begin{tabular}{} \\hline \\\\ r1c1 & r1c2 \\\\ \\hline r2c1 & r2c2 \\\\ \\hline  \\end{tabular}"
        );
        expect(pretext).toEqual(
            '<tabular top="medium"><row bottom="medium"><cell> r1c1 </cell><cell> r1c2 </cell></row><row bottom="medium"><cell>  r2c1 </cell><cell> r2c2 </cell></row></tabular>'
        );

        pretext = convert(
            "\\begin{tabular}{} r1c1 & r1c2 \\\\ \\hline r2c1 & r2c2 \\end{tabular}"
        );
        expect(pretext).toEqual(
            '<tabular><row bottom="medium"><cell>r1c1 </cell><cell> r1c2 </cell></row><row><cell>  r2c1 </cell><cell> r2c2</cell></row></tabular>'
        );
    });
    it("replaces the emph box environment", () => {
        pretext = convert(
            "\\begin{emphbox}[Takeaway]\nA vector is not the same as a line segment.\n\\end{emphbox}"
        );
        expect(pretext).toEqual(
            "<remark><title>Takeaway</title><p>A vector is not the same as a line segment.</p></remark>"
        );
    });
    it("replaces inline math", () => {
        pretext = convert("Consider$x+y$foo");
        expect(pretext).toEqual("Consider<m>x+y</m>foo");
    });
    it("replaces display math", () => {
        pretext = convert("foo\\[x+y\\]bar\n\nextra words");
        expect(pretext).toEqual(
            "<p>foo</p><p><me>x+y</me></p><p>bar</p><p>extra words</p>"
        );
    });
    // shouldn't need these replacements; remove test when verified.
    it.skip("replaces special math characters", () => {
        pretext = convert("<>&");
        expect(pretext).toEqual("\\lt\\gt&#x26;");
    });
    it.skip("replaces itemize and enumerate environments where items have arguments", () => {
        pretext = convert(
            "\\begin{itemize}\\item[(foo)] item 1 content.\\item[(bar)] item 2 content.\\end{itemize}"
        );
        expect(pretext).toEqual(
            "<p><dl><li><title>(foo)</title><p>item 1 content.</p></li><li><title>(bar)</title><p>item 2 content.</p></li></dl></p>"
        );
        pretext = convert(
            "\\begin{enumerate}\\item[(foo)] item 1 content.\\item[(bar)] item 2 content.\\end{enumerate}"
        );
        expect(pretext).toEqual(
            "<p><dl><li><title>(foo)</title><p>item 1 content.</p></li><li><title>(bar)</title><p>item 2 content.</p></li></dl></p>"
        );
    });
    it.skip("replaces itemize environment where items have no arguments", () => {
        pretext = convert(
            "\\begin{itemize}\\item item 1 content.\\item item 2 content.\\end{itemize}"
        );
        expect(pretext).toEqual(
            "<p><ul><li><p>item 1 content.</p></li><li><p>item 2 content.</p></li></ul></p>"
        );
    });
    it.skip("replaces enumerate environment", () => {
        pretext = convert(
            "\\begin{enumerate}\\item item 1 content.\\item item 2 content.\\end{enumerate}"
        );
        expect(pretext).toEqual(
            "<p><ol><li><p>item 1 content.</p></li><li><p>item 2 content.</p></li></ol></p>"
        );
    });
    it("replaces exercises environment", () => {
        pretext = convert(
            "\\begin{exercises} \\begin{problist} \\prob exercise 1 \\begin{solution} this is a solution \\end{solution} \\prob exercise 2 \\end{problist} \\end{exercises}"
        );
        expect(pretext).toEqual(
            "<exercises><exercise><statement><p>exercise 1</p></statement><solution><p>this is a solution</p></solution></exercise><exercise><statement><p>exercise 2</p></statement></exercise></exercises>"
        );
    });
    it("replaces definition environment with no optional argument", () => {
        pretext = convert(
            "\\begin{definition} This is the definition \\end{definition}"
        );
        expect(pretext).toEqual(
            "<definition><statement><p>This is the definition</p></statement></definition>"
        );
    });
    it("replaces definition environment with optional argument", () => {
        pretext = convert(
            "\\begin{definition}[Definition Title] This is the definition \\end{definition}"
        );
        expect(pretext).toEqual(
            "<definition><title>Definition Title</title><statement><p>This is the definition</p></statement></definition>"
        );
    });
    it("replaces theorem environment with no optional argument", () => {
        pretext = convert(
            "\\begin{theorem} This is the theorem \\end{theorem}"
        );
        expect(pretext).toEqual(
            "<theorem><statement><p>This is the theorem</p></statement></theorem>"
        );
    });
    it("replaces theorem environment with optional argument", () => {
        pretext = convert(
            "\\begin{theorem}[Theorem Title] This is the theorem \\end{theorem}"
        );
        expect(pretext).toEqual(
            "<theorem><title>Theorem Title</title><statement><p>This is the theorem</p></statement></theorem>"
        );
    });
    it("replaces equation environment", () => {
        pretext = convert("\\begin{equation} 1+1=2 \\end{equation}");
        expect(pretext).toEqual("<p><men>1+1=2</men></p>");
    });
    it("replaces proof environment", () => {
        pretext = convert("\\begin{proof} This is the proof \\end{proof}");
        expect(pretext).toEqual("<proof><p>This is the proof</p></proof>");
    });
    it("puts equation, align and align* environments in math mode", () => {
        pretext = convert("\\begin{align*} \\somemathmacro \\end{align*}");
        expect(pretext).toEqual("<p><md><mrow>\\somemathmacro</mrow></md></p>");

        pretext = convert("\\begin{align} \\somemathmacro \\end{align}");
        expect(pretext).toEqual("<p><md><mrow>\\somemathmacro</mrow></md></p>");

        pretext = convert("\\begin{equation} \\somemathmacro \\end{equation}");
        expect(pretext).toEqual("<p><men>\\somemathmacro</men></p>");
    });
});
