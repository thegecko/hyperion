const fs          = require("fs");
const del         = require("del");
const gulp        = require("gulp");
const source      = require("vinyl-source-stream");
const download    = require("gulp-download-stream");
const protobuf    = require("protobuf-templates");
const browserify  = require("browserify");
const tsify       = require("tsify");
const browserSync = require("browser-sync");

let protoRepo = "https://api.github.com/repos/thegecko/hyperion/contents/proto";
let protoFiles = [
    "rpc.proto",
    "system.proto"
];

let srcDir = "src";
let protoDir = `${srcDir}/_proto`;
let srcEntry = `${srcDir}/index.ts`;
let srcFiles = [
    `${srcDir}/**/*.{ts,tsx}`,
    `!${srcDir}/_proto/**`
];
let distDir = "dist";
let distFiles = `${distDir}/**/*.*`;
let bundleDir = `${distDir}/bundles`;

let watching = false;
let launch = false;

// Set watching
gulp.task("setWatch", () => {
    watching = true;
});

// Set launch
gulp.task("setLaunch", () => {
    launch = true;
});

// Clear built directories
gulp.task("clean", () => {
    if (!watching) return del([bundleDir, protoDir]);
});

// Generate TypeScript from .proto files
gulp.task("protobuf", ["clean"], () => {
    // Only autogen if required
    if (fs.existsSync(protoDir)) return;

    return download(protoFiles, {
        baseUrl: protoRepo,
        headers: {
            Accept: "application/vnd.github.v4.raw",
            "User-Agent": "protobuf"
        }
    })
    .pipe(protobuf({
        template: "client"
    }))
    .pipe(gulp.dest(protoDir));
});

// Build TypeScript source
gulp.task("compile", ["protobuf"], () => {
    return browserify(srcEntry)
    .plugin(tsify)
    .bundle()
    .pipe(source("index.js"))
    .pipe(gulp.dest(bundleDir));
});

// Watch for source changes and run browserSync watching for rebuilds
gulp.task("watch", ["setWatch", "default"], () => {
    browserSync.init({
        port: 3003,
        server: distDir,
        open: launch
    });

    gulp.watch(srcFiles, ["default"]);
    gulp.watch(distFiles).on("change", browserSync.reload);
});

gulp.task("launch", ["setLaunch", "watch"]);
gulp.task("default", ["compile"]);
