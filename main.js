const {
    app,
    BrowserWindow,
    dialog,
    ipcMain
} = require("electron/main");

const path = require("node:path");
const { spawn } = require("node:child_process");

const sharp = require("sharp");
const ffmpegPath = require("ffmpeg-static");

let mainWindow = null;

const OUTPUT_SIZES = {
    vidnet: {
        width: 1920,
        height: 1080
    },

    marquee: {
        width: 840,
        height: 144
    }
};


/* ========================================
   Create Electron window
   ======================================== */

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 700,
        minWidth: 400,
        minHeight: 400,

        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.removeMenu();

    mainWindow.loadFile("index.html");

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}


/* ========================================
   Output filename
   ======================================== */

function getOutputName(originalName, mediaType) {
    const parsedName = path.parse(originalName);

    if (mediaType === "video") {
        return `${parsedName.name}-converted.mp4`;
    }

    return `${parsedName.name}-converted${parsedName.ext}`;
}


/* ========================================
   Save dialog file filters
   ======================================== */

function getSaveFilters(mediaType, originalName) {
    if (mediaType === "video") {
        return [
            {
                name: "MP4 Video",
                extensions: ["mp4"]
            }
        ];
    }

    const extension = path
        .extname(originalName)
        .slice(1)
        .toLowerCase();

    const imageFilters = {
        png: {
            name: "PNG Image",
            extensions: ["png"]
        },

        jpg: {
            name: "JPEG Image",
            extensions: ["jpg"]
        },

        jpeg: {
            name: "JPEG Image",
            extensions: ["jpeg"]
        },

        gif: {
            name: "GIF Image",
            extensions: ["gif"]
        }
    };

    return [
        imageFilters[extension] ?? {
            name: "PNG Image",
            extensions: ["png"]
        }
    ];
}


/* ========================================
   Image conversion
   ======================================== */

async function convertImage({
    inputPath,
    outputPath,
    width,
    height
}) {
    const extension = path
        .extname(outputPath)
        .slice(1)
        .toLowerCase();

    let pipeline = sharp(inputPath, {
        animated: extension === "gif"
    })
        .rotate()
        .resize(width, height, {
            fit: "fill"
        })
        .withMetadata({
            density: 72
        });

    if (extension === "jpg" || extension === "jpeg") {
        pipeline = pipeline.jpeg({
            quality: 90
        });
    } else if (extension === "gif") {
        pipeline = pipeline.gif();
    } else {
        pipeline = pipeline.png();
    }

    await pipeline.toFile(outputPath);
}


/* ========================================
   Video conversion
   ======================================== */

function convertVideo({
    inputPath,
    outputPath,
    width,
    height
}) {
    return new Promise((resolve, reject) => {
        if (!ffmpegPath) {
            reject(
                new Error(
                    "FFmpeg could not be found. " +
                    "Run npm install ffmpeg-static."
                )
            );

            return;
        }

        /*
         * Scale proportionally, then add black padding until
         * the output reaches the exact target dimensions.
         */
        const videoFilter = [
            `scale=${width}:${height}`,
            "setsar=1"
        ].join(",");

        const argumentsList = [
            "-y",
            "-i",
            inputPath,

            "-vf",
            videoFilter,

            "-c:v",
            "libx264",

            "-preset",
            "medium",

            "-crf",
            "20",

            "-pix_fmt",
            "yuv420p",

            "-c:a",
            "aac",

            "-b:a",
            "192k",

            "-movflags",
            "+faststart",

            outputPath
        ];

        const ffmpegProcess = spawn(
            ffmpegPath,
            argumentsList,
            {
                windowsHide: true
            }
        );

        let errorOutput = "";

        ffmpegProcess.stderr.on("data", (chunk) => {
            errorOutput += chunk.toString();
        });

        ffmpegProcess.on("error", (error) => {
            reject(error);
        });

        ffmpegProcess.on("close", (exitCode) => {
            if (exitCode === 0) {
                resolve();
                return;
            }

            const finalErrorLine =
                errorOutput
                    .trim()
                    .split("\n")
                    .slice(-1)[0] ||
                `FFmpeg exited with code ${exitCode}.`;

            reject(new Error(finalErrorLine));
        });
    });
}


/* ========================================
   Conversion request from renderer
   ======================================== */

ipcMain.handle(
    "convert-file",

    async (
        event,
        {
            inputPath,
            originalName,
            mediaType,
            displayType
        }
    ) => {
        try {
            if (!inputPath || !originalName) {
                throw new Error(
                    "The selected file information is incomplete."
                );
            }

            const dimensions = OUTPUT_SIZES[displayType];

            if (!dimensions) {
                throw new Error(
                    "The selected display type is invalid."
                );
            }

            const defaultName = getOutputName(
                originalName,
                mediaType
            );

            const saveResult = await dialog.showSaveDialog(
                mainWindow,
                {
                    title: "Save Converted File",
                    buttonLabel: "Save",

                    defaultPath: path.join(
                        app.getPath("downloads"),
                        defaultName
                    ),

                    filters: getSaveFilters(
                        mediaType,
                        originalName
                    )
                }
            );

            if (
                saveResult.canceled ||
                !saveResult.filePath
            ) {
                return {
                    success: false,
                    canceled: true
                };
            }

            const conversionOptions = {
                inputPath,
                outputPath: saveResult.filePath,
                width: dimensions.width,
                height: dimensions.height
            };

            if (mediaType === "image") {
                await convertImage(conversionOptions);
            } else if (mediaType === "video") {
                await convertVideo(conversionOptions);
            } else {
                throw new Error(
                    "This file type cannot be converted."
                );
            }

            return {
                success: true,
                canceled: false,
                outputPath: saveResult.filePath
            };
        } catch (error) {
            console.error("File conversion failed:", error);

            return {
                success: false,
                canceled: false,

                error:
                    error instanceof Error
                        ? error.message
                        : "An unknown conversion error occurred."
            };
        }
    }
);


/* ========================================
   Electron lifecycle
   ======================================== */

app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
        if (
            BrowserWindow.getAllWindows().length === 0
        ) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});