import { execSync } from "child_process";
import * as fs from "fs";
import { createHash } from "crypto";
import { printRaw } from "latex-ast-parser";
import * as Ast from "latex-ast-parser/dist/src/libs/ast-types";

const SCALE_FACTOR = 1.3;

const LATEX_COMMAND = "lualatex --shell-escape tikz-render.tex";
// Need `-c` to clean up the files when done
//const LATEX_COMMAND = `latexmk -lualatex -latexoption="-interaction nonstopmode -halt-on-error -file-line-error" tikz-render.tex`

/**
 * Renders `ast` in a standalone latex document and converts the result to an svg.
 * The path of the resulting svg is returned. This function assumes that you have a `tikz-render.tex`
 * file in the `templates` directory.
 */
export function renderFigure(ast: Ast.Ast): string {
    const renderedAst = printRaw(ast);
    const hash = createHash("md5").update(renderedAst).digest("hex");
    const outFile = `tmp/rendered-${hash}.svg`;
    if (fs.existsSync(outFile)) {
        return outFile;
    }

    let texFileSource = fs.readFileSync("templates/tikz-render.tex", "utf8");
    texFileSource = texFileSource.replace("TIKZPICTURE", renderedAst);
    fs.writeFileSync("tmp/tikz-render.tex", texFileSource, "utf8");

    if (fs.existsSync("tmp/tikz-render.pdf")) {
        fs.rmSync("tmp/tikz-render.pdf");
    }

    let compileInfo = execSync(LATEX_COMMAND, {
        cwd: "tmp",
        encoding: "utf8",
    });

    if (!fs.existsSync("tmp/tikz-render.pdf")) {
        throw new Error(
            `Failed to render latex template. Info below\n\n${compileInfo}`
        );
    }

    if (fs.existsSync("tmp/tikz-render.svg")) {
        fs.rmSync("tmp/tikz-render.svg");
    }

    compileInfo = execSync("pdftocairo -svg tikz-render.pdf", {
        cwd: "tmp",
        encoding: "utf8",
    });

    if (!fs.existsSync("tmp/tikz-render.svg")) {
        throw new Error(
            `Failed to convert pdf to svg. Info below\n\n${compileInfo}`
        );
    }

    // The SVG needs to be scaled because it's currently too small for a webpage
    let svgFile = fs.readFileSync("tmp/tikz-render.svg", "utf8");
    svgFile = svgFile
        .replace(
            /width="(\d+\.?\d*|\.\d+)pt"/,
            (a, val) => `width="${SCALE_FACTOR * +val}pt"`
        )
        .replace(
            /height="(\d+\.?\d*|\.\d+)pt"/,
            (a, val) => `height="${SCALE_FACTOR * +val}pt"`
        );

    fs.writeFileSync(outFile, svgFile, "utf8");

    return outFile;
}
