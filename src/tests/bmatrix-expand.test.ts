import { describe, it, expect } from "vitest";
import { convert } from "./sample-converter";

describe("bmatrix-expand", () => {
    it("bmatrix environment expands to array environment if optional argument provided", () => {
        expect(
            convert("$\\begin{bmatrix}[cc|c] 1 & 2 & 3\\end{bmatrix}$")
        ).toEqual(
            String.raw`<m>\left[\begin{array}{cc|c}1 &#x26; 2 &#x26; 3\end{array}\right]</m>`
        );
    });
});
