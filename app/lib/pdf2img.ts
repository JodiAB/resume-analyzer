import { retryableLoader } from './retryable-loader';

export interface PdfConversionResult {
    imageUrl: string;
    file: File | null;
    error?: string;
}

const loadPdfJs = retryableLoader(async () => {
    // @ts-expect-error - pdfjs-dist/build/pdf.mjs is not a module
    return import("pdfjs-dist/build/pdf.mjs").then((lib) => {
        // Set the worker source to use local file
        lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        return lib;
    });

});

export async function convertPdfToImage(
    file: File
): Promise<PdfConversionResult> {
    let task: { promise: Promise<any>; destroy: () => Promise<void> } | undefined;
    try {
        if (!file.size || file.size > 20 * 1024 * 1024) throw new Error('PDF file size limit exceeded');
        const lib = await loadPdfJs();

        const arrayBuffer = await file.arrayBuffer();
        task = lib.getDocument({ data: arrayBuffer });
        const pdf = await task!.promise;
        const page = await pdf.getPage(1);

        const viewport = page.getViewport({ scale: 4 });
        if (!Number.isFinite(viewport.width) || !Number.isFinite(viewport.height) || viewport.width <= 0 || viewport.height <= 0 || viewport.width > 8192 || viewport.height > 8192 || viewport.width * viewport.height > 16000000) throw new Error('PDF preview pixel limit exceeded');
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) throw new Error('PDF preview canvas unavailable');

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        if (context) {
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = "high";
        }

        await page.render({ canvasContext: context!, viewport }).promise;

        return await new Promise<PdfConversionResult>((resolve) => {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        // Create a File from the blob with the same name as the pdf
                        const originalName = file.name.replace(/\.pdf$/i, "");
                        const imageFile = new File([blob], `${originalName}.png`, {
                            type: "image/png",
                        });

                        resolve({
                            imageUrl: URL.createObjectURL(blob),
                            file: imageFile,
                        });
                    } else {
                        resolve({
                            imageUrl: "",
                            file: null,
                            error: "Failed to create image blob",
                        });
                    }
                },
                "image/png",
                1.0
            ); // Set quality to maximum (1.0)
        });
    } catch (err) {
        return {
            imageUrl: "",
            file: null,
            error: `Failed to convert PDF: ${err}`,
        };
    } finally {
        try { await task?.destroy(); } catch { /* Do not replace the original conversion outcome. */ }
    }
}
