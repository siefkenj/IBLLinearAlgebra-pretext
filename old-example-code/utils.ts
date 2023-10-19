import { printRaw, tools } from "latex-ast-parser";
import * as Ast from "latex-ast-parser/dist/src/libs/ast-types";

export function nodesToHtmlId(nodes: Ast.Node[]): string {
    return printRaw(nodes || []).replace(/[^a-zA-Z0-9]/g, "-");
}
