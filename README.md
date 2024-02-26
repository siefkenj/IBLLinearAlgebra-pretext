# IBLLinearAlgebra-pretext

Pretext conversion for IBLLinearAlgebra

This is a playground repository for converting [IBLLinearAlgebra](https://github.com/siefkenj/IBLLinearAlgebra/) to PreTeXt.

## Getting started

In a linux/mac environment, run

```
npm install
```

from the project directory. Then you should be able to run

```
npx vite-node src/convert-to-pretext.ts -s
```

to see a sample run (there should be no errors).

## Converting the Book

You can convert the whole book by pointing `convert-textbook.ts` to the location of the `linearalgebra.tex` file.
```
npx vite src/convert-textbook.ts -i book/linearalgebra.tex
```

## Contents

-   `src/` is where all the code for the conversion goes.
-   `book/` is has a copy of the tex source of IBLLinearAlgebra
-   `prerendered-figures/` has svg versions of each figure suffixed by an MD5 sum of the figure's tikz code. This can be used to match up a figure with its given position in the book. (see `old-example-code/tikz.ts` for how this is done.)
-   `figure-render-environment/` has a standalone environment for rendering tikz figures one-by-one.
-   `old-example-code/` has code that was written for an old version of `unified-latex` (before it even had that name) that was used for a partial HTML conversion of the book. Files in this dir won't execute, but you can look through the code to get some ideas.
