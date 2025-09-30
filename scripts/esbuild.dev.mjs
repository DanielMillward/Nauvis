import esbuildServe from "esbuild-serve";

esbuildServe(
  {
    logLevel: "info",
    entryPoints: ["src/testing/test.ts"],
    bundle: true,
    sourcemap: true,
    outfile: "public/bundle.min.js",
  },
  { root: "./public", port: 5500 },
);
