const {
    ipcRenderer,
    webUtils
} = require("electron");

const sharp = require("sharp");

document.addEventListener("DOMContentLoaded", () => {
    /* ========================================
       DOM references
       ======================================== */

    const fileInput = document.querySelector("#media-files");
    const uploadArea = document.querySelector(".upload-area");

    const mediaList = document.querySelector("#media-list");
    const fileCount = document.querySelector("#file-count");
    const emptyFileMessage = document.querySelector(
        "#empty-file-message"
    );

    const emptyAppState = document.querySelector(
        "#empty-app-state"
    );

    const selectedFileContent = document.querySelector(
        "#selected-file-content"
    );

    const selectedFileName = document.querySelector(
        "#selected-file-name"
    );

    const selectedFileType = document.querySelector(
        "#selected-file-type"
    );

    const selectedFileDimensions = document.querySelector(
        "#selected-file-dimensions"
    );

    const selectedFileDpiRow = document.querySelector(
        "#selected-file-dpi-row"
    );

    const selectedFileDpi = document.querySelector(
        "#selected-file-dpi"
    );

    const selectedFileDurationRow = document.querySelector(
        "#selected-file-duration-row"
    );

    const selectedFileDuration = document.querySelector(
        "#selected-file-duration"
    );

    const previewFrame = document.querySelector("#preview-frame");

    const validationStatus = document.querySelector(
        "#validation-status"
    );

    const generatedMessage = document.querySelector(
        "#generated-message"
    );

    const copyMessageButton = document.querySelector(
        "#copy-message-button"
    );

    const convertFileButton = document.querySelector(
        ".convert-file-button"
    );

    const displayTypeInputs = document.querySelectorAll(
        'input[name="display-type"]'
    );


    /* ========================================
       Application state
       ======================================== */

    let mediaItems = [];
    let selectedId = null;
    let currentMessage = "";

    /*
     * Prevents an older asynchronous metadata request from
     * overwriting a file selected more recently.
     */
    let selectionRequestNumber = 0;
    let copyFeedbackTimer = null;


    /* ========================================
       Feather Icons
       ======================================== */

    function renderFeatherIcons() {
        if (!window.feather) {
            console.warn("Feather Icons failed to load.");
            return;
        }

        window.feather.replace({
            width: 18,
            height: 18,
            "stroke-width": 1.8
        });
    }

    renderFeatherIcons();


    /* ========================================
       File upload
       ======================================== */

    fileInput.addEventListener("change", () => {
        addFiles(fileInput.files);

        /*
         * Clearing the input allows the same file to be
         * selected again after it has been removed.
         */
        fileInput.value = "";
    });


    /* ========================================
       Drag and drop
       ======================================== */

    uploadArea.addEventListener("dragenter", preventDefault);
    uploadArea.addEventListener("dragover", preventDefault);

    uploadArea.addEventListener("drop", (event) => {
        event.preventDefault();
        addFiles(event.dataTransfer.files);
    });

    function preventDefault(event) {
        event.preventDefault();
    }


    /* ========================================
       Add files
       ======================================== */

    function addFiles(fileList) {
        const incomingFiles = Array.from(fileList);
        const addedItems = [];

        incomingFiles.forEach((file) => {
            if (!isSupportedFile(file)) {
                console.warn(
                    `Unsupported file skipped: ${file.name}`
                );
                return;
            }

            /*
             * This is stronger than checking only the filename.
             * Two different files may legally share a name.
             */
            const isDuplicate = mediaItems.some((item) => {
                return (
                    item.file.name === file.name &&
                    item.file.size === file.size &&
                    item.file.lastModified === file.lastModified
                );
            });

            if (isDuplicate) {
                return;
            }

            const item = {
                id: createId(),
                file,
                previewUrl: URL.createObjectURL(file),
                metadata: null,
                metadataPromise: null
            };

            mediaItems.push(item);
            addedItems.push(item);
        });

        if (selectedId === null && mediaItems.length > 0) {
            selectedId = mediaItems[0].id;
        }

        updateApplicationState();
        renderMediaList();

        if (selectedId !== null) {
            displaySelectedMedia(selectedId);
        }

        /*
         * Read the remaining files in the background so their
         * dimensions can appear in the sidebar.
         */
        addedItems.forEach((item) => {
            getMetadata(item)
                .then(() => {
                    updateMediaEntryMetadata(item);
                })
                .catch((error) => {
                    console.error(
                        `Could not read ${item.file.name}:`,
                        error
                    );
                });
        });
    }


    /* ========================================
       Supported file checking
       ======================================== */

    function isSupportedFile(file) {
        return isImageFile(file) || isVideoFile(file);
    }

    function isImageFile(file) {
        const extension = getFileExtension(file.name);

        return (
            file.type === "image/png" ||
            file.type === "image/jpeg" ||
            file.type === "image/gif" ||
            ["png", "jpg", "jpeg", "gif"].includes(extension)
        );
    }

    function isVideoFile(file) {
        const extension = getFileExtension(file.name);

        return (
            file.type.startsWith("video/") ||
            [
                "mp4",
                "mov",
                "avi",
                "wmv",
                "webm",
                "m4v"
            ].includes(extension)
        );
    }


    /* ========================================
       Media list rendering
       ======================================== */

    function updateSelectedMediaEntry() {
        const mediaEntries = mediaList.querySelectorAll(
            ".media-entry"
        );

        mediaEntries.forEach((entry) => {
            const isSelected =
                entry.dataset.id === selectedId;

            entry.classList.toggle(
                "is-selected",
                isSelected
            );

            const selectButton = entry.querySelector(
                ".media-entry-select"
            );

            if (!selectButton) {
                return;
            }

            if (isSelected) {
                selectButton.setAttribute(
                    "aria-current",
                    "true"
                );
            } else {
                selectButton.removeAttribute(
                    "aria-current"
                );
            }
        });
    }

    function updateMediaEntryMetadata(item) {
        const entry = mediaList.querySelector(
            `.media-entry[data-id="${CSS.escape(item.id)}"]`
        );

        if (!entry || !item.metadata) {
            return;
        }

        const dimensions = entry.querySelector(
            ".media-entry-dimensions"
        );

        const selectButton = entry.querySelector(
            ".media-entry-select"
        );

        const dimensionsText =
            `${item.metadata.width} × ` +
            `${item.metadata.height} px`;

        if (dimensions) {
            dimensions.textContent = dimensionsText;
        }

        if (selectButton) {
            selectButton.setAttribute(
                "aria-label",
                `Select ${item.file.name}, ${dimensionsText}`
            );
        }
    }

    function renderMediaList() {
        mediaList.replaceChildren();

        mediaItems.forEach((item) => {
            const listItem = document.createElement("li");
            listItem.className = "media-entry";
            listItem.dataset.id = item.id;

            if (item.id === selectedId) {
                listItem.classList.add("is-selected");
            }

            const selectButton = document.createElement("button");
            selectButton.type = "button";
            selectButton.className = "media-entry-select";
            selectButton.dataset.id = item.id;

            const dimensionsText = item.metadata
                ? `${item.metadata.width} × ${item.metadata.height} px`
                : "Reading dimensions";

            selectButton.setAttribute(
                "aria-label",
                `Select ${item.file.name}, ${dimensionsText}`
            );

            if (item.id === selectedId) {
                selectButton.setAttribute("aria-current", "true");
            }

            const thumbnail = document.createElement("span");
            thumbnail.className = "media-thumbnail";

            if (isImageFile(item.file)) {
                const image = document.createElement("img");
                image.src = item.previewUrl;
                image.alt = "";
                thumbnail.append(image);
            } else {
                const video = document.createElement("video");
                video.src = item.previewUrl;
                video.muted = true;
                video.preload = "metadata";
                video.setAttribute("aria-hidden", "true");
                thumbnail.append(video);
            }

            const textContainer = document.createElement("span");
            textContainer.className = "media-entry-text";

            const name = document.createElement("span");
            name.className = "media-entry-name";
            name.textContent = item.file.name;

            const dimensions = document.createElement("span");
            dimensions.className = "media-entry-dimensions";
            dimensions.textContent = dimensionsText;

            textContainer.append(name, dimensions);
            selectButton.append(thumbnail, textContainer);

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "media-entry-delete";
            deleteButton.dataset.id = item.id;

            deleteButton.setAttribute(
                "aria-label",
                `Delete ${item.file.name} permanently`
            );

            const trashIcon = document.createElement("i");
            trashIcon.dataset.feather = "trash-2";
            trashIcon.setAttribute("aria-hidden", "true");

            const tooltip = document.createElement("span");
            tooltip.className = "button-tooltip";
            tooltip.id = `delete-tooltip-${item.id}`;
            tooltip.setAttribute("role", "tooltip");
            tooltip.textContent = "Delete this file permanently";

            deleteButton.setAttribute(
                "aria-describedby",
                tooltip.id
            );

            deleteButton.append(trashIcon, tooltip);
            listItem.append(selectButton, deleteButton);
            mediaList.append(listItem);
        });

        renderFeatherIcons();
    }


    /* ========================================
       List interaction using event delegation
       ======================================== */

    mediaList.addEventListener("click", (event) => {
        const deleteButton = event.target.closest(
            ".media-entry-delete"
        );

        if (deleteButton) {
            event.stopPropagation();
            removeMedia(deleteButton.dataset.id);
            return;
        }

        const selectButton = event.target.closest(
            ".media-entry-select"
        );

        if (selectButton) {
            displaySelectedMedia(selectButton.dataset.id);
        }
    });


    /* ========================================
       Delete files
       ======================================== */

    function removeMedia(id) {
        const removedIndex = mediaItems.findIndex(
            (item) => item.id === id
        );

        if (removedIndex === -1) {
            return;
        }

        const removedItem = mediaItems[removedIndex];

        URL.revokeObjectURL(removedItem.previewUrl);
        mediaItems.splice(removedIndex, 1);

        if (selectedId === id) {
            /*
             * Prefer the next file. If none exists, select the
             * previous file. If the list is empty, select nothing.
             */
            const replacement =
                mediaItems[removedIndex] ??
                mediaItems[removedIndex - 1] ??
                null;

            selectedId = replacement?.id ?? null;
        }

        updateApplicationState();
        renderMediaList();

        if (selectedId !== null) {
            displaySelectedMedia(selectedId);
        } else {
            clearSelectedMedia();
        }
    }


    /* ========================================
       Empty / populated states
       ======================================== */

    function updateApplicationState() {
        const hasFiles = mediaItems.length > 0;

        fileCount.textContent = `(${mediaItems.length})`;

        emptyFileMessage.hidden = hasFiles;
        mediaList.hidden = !hasFiles;

        emptyAppState.hidden = hasFiles;
        selectedFileContent.hidden = !hasFiles;
    }

    function clearSelectedMedia() {
        selectionRequestNumber += 1;
        currentMessage = "";

        previewFrame.replaceChildren();

        selectedFileName.textContent = "—";
        selectedFileType.textContent = "—";
        selectedFileDimensions.textContent = "—";

        selectedFileDpiRow.hidden = true;
        selectedFileDurationRow.hidden = true;

        validationStatus.textContent = "Waiting";
        validationStatus.className = "status-badge";

        generatedMessage.textContent =
            "Select a file to view its validation message.";

        copyMessageButton.disabled = true;
        convertFileButton.disabled = true;
    }


    /* ========================================
       Selected file
       ======================================== */

    async function displaySelectedMedia(id) {
        const item = mediaItems.find(
            (mediaItem) => mediaItem.id === id
        );

        if (!item) {
            return;
        }

        selectedId = id;
        const currentRequest = ++selectionRequestNumber;

        updateSelectedMediaEntry();
        updateApplicationState();

        selectedFileName.textContent = item.file.name;
        selectedFileType.textContent = "Reading file";
        selectedFileDimensions.textContent = "Reading dimensions";

        selectedFileDpiRow.hidden = true;
        selectedFileDurationRow.hidden = true;

        validationStatus.textContent = "Reading";
        validationStatus.className =
            "status-badge status-warning";

        generatedMessage.textContent =
            "Reading file information...";

        copyMessageButton.disabled = true;
        convertFileButton.disabled = true;
        currentMessage = "";

        renderPreview(item);

        try {
            const metadata = await getMetadata(item);

            /*
             * Ignore this result if another file was selected
             * while metadata was loading.
             */
            if (
                currentRequest !== selectionRequestNumber ||
                selectedId !== id
            ) {
                return;
            }

            displayMetadata(item, metadata);
            displayValidation(metadata);
            convertFileButton.disabled = false;
            updateMediaEntryMetadata(item);
        } catch (error) {
            if (currentRequest !== selectionRequestNumber) {
                return;
            }

            console.error(error);
            displayMetadataError(item, error);
        }
    }


    /* ========================================
       Preview
       ======================================== */

    function renderPreview(item) {
        previewFrame.replaceChildren();

        if (isImageFile(item.file)) {
            const image = document.createElement("img");
            image.src = item.previewUrl;
            image.alt = `Preview of ${item.file.name}`;

            previewFrame.append(image);
            return;
        }

        if (isVideoFile(item.file)) {
            const video = document.createElement("video");
            video.src = item.previewUrl;
            video.controls = true;
            video.preload = "metadata";

            video.setAttribute(
                "aria-label",
                `Preview of ${item.file.name}`
            );

            previewFrame.append(video);
        }
    }


    /* ========================================
       Metadata
       ======================================== */

    async function getMetadata(item) {
        if (item.metadata) {
            return item.metadata;
        }

        if (item.metadataPromise) {
            return item.metadataPromise;
        }

        item.metadataPromise = isImageFile(item.file)
            ? getImageMetadata(item.file)
            : getVideoMetadata(item.file, item.previewUrl);

        try {
            item.metadata = await item.metadataPromise;
            return item.metadata;
        } finally {
            item.metadataPromise = null;
        }
    }

    async function getImageMetadata(file) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const metadata = await sharp(buffer).metadata();

        return {
            mediaType: "image",
            format:
                metadata.format ??
                getFileExtension(file.name),
            width: metadata.width,
            height: metadata.height,
            density: metadata.density ?? null,
            duration: null
        };
    }

    function getVideoMetadata(file, previewUrl) {
        return new Promise((resolve, reject) => {
            const video = document.createElement("video");

            video.preload = "metadata";
            video.src = previewUrl;
            video.muted = true;

            video.addEventListener(
                "loadedmetadata",
                () => {
                    resolve({
                        mediaType: "video",
                        format: getFileExtension(file.name),
                        width: video.videoWidth,
                        height: video.videoHeight,
                        density: null,
                        duration: video.duration
                    });
                },
                { once: true }
            );

            video.addEventListener(
                "error",
                () => {
                    reject(
                        new Error(
                            "Unable to retrieve video metadata. " +
                            "The format or codec may not be supported."
                        )
                    );
                },
                { once: true }
            );
        });
    }


    /* ========================================
       Display metadata
       ======================================== */

    function displayMetadata(item, metadata) {
        const extension =
            metadata.format || getFileExtension(item.file.name);

        selectedFileName.textContent = item.file.name;

        selectedFileType.textContent =
            metadata.mediaType === "image"
                ? `Image (.${extension})`
                : `Video (.${extension})`;

        selectedFileDimensions.textContent =
            `${metadata.width} × ${metadata.height} px`;

        if (
            metadata.mediaType === "image" &&
            metadata.format !== "gif"
        ) {
            selectedFileDpiRow.hidden = false;

            selectedFileDpi.textContent =
                metadata.density === null
                    ? "Not embedded"
                    : `${metadata.density} DPI`;
        } else {
            selectedFileDpiRow.hidden = true;
        }

        if (metadata.mediaType === "video") {
            selectedFileDurationRow.hidden = false;
            selectedFileDuration.textContent =
                formatDuration(metadata.duration);
        } else {
            selectedFileDurationRow.hidden = true;
        }
    }

    function displayMetadataError(item, error) {
        selectedFileName.textContent = item.file.name;
        selectedFileType.textContent = "Unable to read";
        selectedFileDimensions.textContent = "Unknown";

        selectedFileDpiRow.hidden = true;
        selectedFileDurationRow.hidden = true;

        validationStatus.textContent = "Error";
        validationStatus.className =
            "status-badge status-error";

        currentMessage =
            `Unable to inspect ${item.file.name}. ` +
            `${error.message}`;

        generatedMessage.textContent = currentMessage;
        copyMessageButton.disabled = false;
    }


    /* ========================================
       Validation
       ======================================== */

    function displayValidation(metadata) {
        const targetDisplay = getSelectedDisplayType();

        const result = getValidationResult(
            metadata,
            targetDisplay
        );

        currentMessage = result.message;
        generatedMessage.textContent = result.message;

        validationStatus.textContent = result.accepted
            ? "Correct"
            : "Incorrect";

        validationStatus.className = result.accepted
            ? "status-badge status-correct"
            : "status-badge status-error";

        copyMessageButton.disabled = false;
    }

    function getValidationResult(metadata, targetDisplay) {
        const {
            mediaType,
            format,
            width,
            height,
            density
        } = metadata;

        const isVidNet = targetDisplay === "vidnet";
        const isGif = format === "gif";

        /*
         * These conditions preserve your original rules:
         *
         * VidNet video:
         * 1920 × 1080
         *
         * VidNet image:
         * 1920 × 1080 and 72 DPI
         * GIFs do not require DPI
         *
         * Marquee image/video:
         * 840 × 144
         */

        if (isVidNet) {
            const dimensionsAreCorrect =
                width === 1920 && height === 1080;

            const dpiIsCorrect =
                mediaType === "video" ||
                isGif ||
                density === 72;

            const accepted =
                dimensionsAreCorrect && dpiIsCorrect;

            if (accepted) {
                return {
                    accepted: true,
                    message:
                        "Your submission has been accepted and " +
                        "will be scheduled to run on the Price " +
                        "Center TV screens."
                };
            }

            if (mediaType === "video") {
                return {
                    accepted: false,
                    message:
                        "Please make sure your submission is " +
                        "1920x1080 pixels as per our " +
                        "specifications. Your submission is " +
                        `${width}x${height} pixels.`
                };
            }

            const submittedDpi =
                density === null
                    ? "does not contain embedded DPI information"
                    : `is ${density} DPI`;

            return {
                accepted: false,
                message:
                    "Please make sure your submission is " +
                    "1920x1080 pixels and 72 DPI as per our " +
                    "specifications. Your submission is " +
                    `${width}x${height} pixels and ` +
                    `${submittedDpi}.`
            };
        }

        const accepted =
            width === 840 && height === 144;

        if (accepted) {
            return {
                accepted: true,
                message:
                    "Your submission has been accepted and will " +
                    "be scheduled to run on the Price Center " +
                    "marquee."
            };
        }

        return {
            accepted: false,
            message:
                "Please make sure your submission is 840x144 " +
                "pixels as per our specifications. Your " +
                `submission is ${width}x${height} pixels.`
        };
    }


    /* ========================================
       VidNet / Marquee selection
       ======================================== */

    displayTypeInputs.forEach((input) => {
        input.addEventListener("change", () => {
            if (selectedId === null) {
                return;
            }

            const selectedItem = mediaItems.find(
                (item) => item.id === selectedId
            );

            if (selectedItem?.metadata) {
                displayValidation(selectedItem.metadata);
            } else {
                displaySelectedMedia(selectedId);
            }
        });
    });

    function getSelectedDisplayType() {
        return (
            document.querySelector(
                'input[name="display-type"]:checked'
            )?.value ?? "marquee"
        );
    }


    /* ========================================
       Copy generated response
       ======================================== */

    copyMessageButton.addEventListener("click", async () => {
        if (!currentMessage) {
            return;
        }

        try {
            await navigator.clipboard.writeText(currentMessage);
            showCopyFeedback("check", "Message copied");
        } catch (error) {
            console.error("Unable to copy message:", error);
            showCopyFeedback("x", "Copy failed");
        }
    });

    function showCopyFeedback(iconName, accessibleLabel) {
        window.clearTimeout(copyFeedbackTimer);

        copyMessageButton.innerHTML =
            `<i data-feather="${iconName}" aria-hidden="true"></i>`;

        copyMessageButton.setAttribute(
            "aria-label",
            accessibleLabel
        );

        renderFeatherIcons();

        copyFeedbackTimer = window.setTimeout(() => {
            copyMessageButton.innerHTML =
                '<i data-feather="copy" aria-hidden="true"></i>';

            copyMessageButton.setAttribute(
                "aria-label",
                "Copy generated message"
            );

            renderFeatherIcons();
        }, 1400);
    }

    /* ========================================
    Convert and save selected file
    ======================================== */

    convertFileButton.addEventListener("click", async () => {
        const selectedItem = mediaItems.find(
            (item) => item.id === selectedId
        );

        if (!selectedItem || !selectedItem.metadata) {
            return;
        }

        /*
        * Electron File objects do not expose the original path
        * directly in newer Electron versions.
        */
        const inputPath = webUtils.getPathForFile(
            selectedItem.file
        );

        if (!inputPath) {
            generatedMessage.textContent =
                "The original file path could not be found. " +
                "Please remove the file, upload it again, and retry.";

            validationStatus.textContent = "Error";
            validationStatus.className =
                "status-badge status-error";

            return;
        }

        const originalButtonText =
            convertFileButton.textContent;

        convertFileButton.disabled = true;
        convertFileButton.textContent = "Converting...";

        try {
            const result = await ipcRenderer.invoke(
                "convert-file",
                {
                    inputPath,

                    originalName:
                        selectedItem.file.name,

                    mediaType:
                        selectedItem.metadata.mediaType,

                    displayType:
                        getSelectedDisplayType()
                }
            );

            /*
            * The user closed the Save As window without saving.
            */
            if (result.canceled) {
                return;
            }

            if (!result.success) {
                throw new Error(
                    result.error || "Conversion failed."
                );
            }

            generatedMessage.textContent =
                `Converted file saved to: ${result.outputPath}`;

            validationStatus.textContent = "Saved";
            validationStatus.className =
                "status-badge status-correct";
        } catch (error) {
            console.error(
                "Unable to convert file:",
                error
            );

            generatedMessage.textContent =
                "Unable to convert the file. " +
                `${error.message}`;

            validationStatus.textContent = "Error";
            validationStatus.className =
                "status-badge status-error";
        } finally {
            convertFileButton.disabled = false;
            convertFileButton.textContent =
                originalButtonText;
        }
    });

    /* ========================================
       Helpers
       ======================================== */

    function createId() {
        if (
            window.crypto &&
            typeof window.crypto.randomUUID === "function"
        ) {
            return window.crypto.randomUUID();
        }

        return (
            `${Date.now()}-` +
            `${Math.random().toString(16).slice(2)}`
        );
    }

    function getFileExtension(filename) {
        const finalPeriod = filename.lastIndexOf(".");

        if (finalPeriod === -1) {
            return "";
        }

        return filename
            .slice(finalPeriod + 1)
            .toLowerCase();
    }

    function formatDuration(seconds) {
        if (!Number.isFinite(seconds)) {
            return "Unknown";
        }

        const totalSeconds = Math.round(seconds);
        const minutes = Math.floor(totalSeconds / 60);
        const remainingSeconds = totalSeconds % 60;

        if (minutes === 0) {
            return `${remainingSeconds} seconds`;
        }

        return (
            `${minutes}:` +
            `${String(remainingSeconds).padStart(2, "0")}`
        );
    }


    /* ========================================
       Clean up generated preview URLs
       ======================================== */

    window.addEventListener("beforeunload", () => {
        mediaItems.forEach((item) => {
            URL.revokeObjectURL(item.previewUrl);
        });
    });


    /* ========================================
       Initial application state
       ======================================== */

    updateApplicationState();
});