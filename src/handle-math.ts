// import { visit } from "@unified-latex/unified-latex-util-visit";
import * as Hast from "hast";
const visit = require('unist-util-visit');
export function mathify(hast: Hast.Root) {
  visit(hast, (node: Hast.Element) => node.tagName === 'p',
    (node: Hast.Element) => {
      console.log(node);
    }
  );
}