const fs          = require("fs");
const del         = require("del");
const gulp        = require("gulp");
const typescript  = require("gulp-typescript");
const download    = require("gulp-download-stream");
const protobuf    = require("protobuf-templates");
const gls         = require("gulp-live-server");

let protoRepo = "https://api.github.com/repos/thegecko/hyperion/contents/proto";
let protoFiles = [
    "rpc.proto",
    "system.proto"
];

let configPath = "tsconfig.json";
let srcDir = "src";
let protoDir = `${srcDir}/_proto`;
let srcFiles = `${srcDir}/**/*.{ts,tsx}`;
let srcFilesOnly = [
    srcFiles,
    `!${srcDir}/_proto/**`
];
let distDir = "dist";
let distFiles = `${distDir}/**/*.{js,jsx}`;

let appSrc = "../ui/dist/**";
let appDir = "app";

let server = `${distDir}/index.js`;
let watching = false;

// Set watching
gulp.task("setWatch", () => {
    watching = true;
});

// Clear built directories
gulp.task("clean", () => {
    if (!watching) return del([distDir, appDir, protoDir]);
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
        template: "server"
    }))
    .pipe(gulp.dest(protoDir));
});

// Build TypeScript source into CommonJS Node modules
gulp.task("compile", ["protobuf"], () => {
    return gulp.src(srcFiles)
    .pipe(typescript.createProject(configPath)()).js
    .pipe(gulp.dest(distDir));
});

// Copy the built app
gulp.task("copy", () => {
    return gulp.src(appSrc)
    .pipe(gulp.dest(appDir));
});

// Watch source files for building and destination files to restart express server
gulp.task("watch", ["setWatch", "default"], () => {
    const host = gls.new(server);
    host.start();
    gulp.watch(distFiles, () => host.start());
    gulp.watch(srcFilesOnly, ["default"]);
});

gulp.task("default", ["compile"]);
