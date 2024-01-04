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
    it("replaces the align* environment", () => {
        pretext = convert(
            "Thus \\begin{align*}x=m+1&=(2k+1)+1=2k+2\\\\&=2(k+1)=2n,\\end{align*}\n\nwhere"
        );
        expect(pretext).toEqual(
            "<p>Thus</p><p><md><mrow>x=m+1&#x26;=(2k+1)+1=2k+2</mrow><mrow>&#x26;=2(k+1)=2n,</mrow></md></p><p>where</p>"
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
    it("replaces defintion environment with optional argument with optional argument", () => {
        pretext = convert(
            "\\begin{definition}[Definition Title] This is the definition \\end{definition}"
        );
        expect(pretext).toEqual(
            "<definition><title>Definition Title</title><statement><p>This is the definition</p></statement></definition>"
        );
    });
    it("replaces equation environment", () => {
        pretext = convert("\\begin{equation} 1+1=2 \\end{equation}");
        expect(pretext).toEqual("<p><men>1+1=2</men></p>");
    });
});
