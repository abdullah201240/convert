import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No image file provided in the request." },
        { status: 400 }
      );
    }

    const widthRaw = formData.get("width") as string | null;
    const heightRaw = formData.get("height") as string | null;
    const qualityRaw = formData.get("quality") as string | null;
    const targetSizeKbRaw = formData.get("targetSizeKb") as string | null;
    const formatRaw = (formData.get("format") as string | null)?.toLowerCase() || "avif";
    const fitModeRaw = (formData.get("fitMode") as string | null)?.toLowerCase() || "inside";

    const isOriginalSize = widthRaw === "original" || (!widthRaw && !heightRaw);
    const parsedWidth = isOriginalSize ? undefined : (widthRaw ? parseInt(widthRaw) : 980);
    const parsedHeight = isOriginalSize ? undefined : (heightRaw ? parseInt(heightRaw) : 1252);
    const parsedQuality = qualityRaw ? Math.max(1, Math.min(100, parseInt(qualityRaw))) : 50;
    const targetSizeKb = targetSizeKbRaw ? parseInt(targetSizeKbRaw) : null;

    const targetFormat = (["avif", "webp", "jpeg", "jpg", "png"].includes(formatRaw) 
      ? formatRaw 
      : "avif") as "avif" | "webp" | "jpeg" | "jpg" | "png";

    const normalizedFormat = targetFormat === "jpg" ? "jpeg" : targetFormat;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Initial sharp instance to inspect metadata and auto-rotate
    let pipeline = sharp(buffer).rotate();

    // 1. Resize if not maintaining original dimensions
    if (!isOriginalSize && parsedWidth && parsedHeight) {
      const validFit = (["inside", "cover", "contain", "fill"].includes(fitModeRaw) 
        ? fitModeRaw 
        : "inside") as "inside" | "cover" | "contain" | "fill";

      pipeline = pipeline.resize({
        width: parsedWidth,
        height: parsedHeight,
        fit: validFit,
        kernel: "lanczos3",
      });
    }

    // Apply smart sharpening
    pipeline = pipeline.sharpen();

    // Determine intermediate format:
    // If the image or target format uses alpha, retain PNG/WebP so transparency is not lost
    const metadata = await sharp(buffer).metadata();
    const hasAlpha = Boolean(metadata.hasAlpha);

    let intermediateBuffer: Buffer;
    if (hasAlpha && normalizedFormat !== "jpeg") {
      intermediateBuffer = await pipeline.webp({ quality: 95, effort: 1 }).toBuffer();
    } else {
      intermediateBuffer = await pipeline.jpeg({ quality: 95 }).toBuffer();
    }

    let processedBuffer: Buffer;
    let outputWidth: number | undefined;
    let outputHeight: number | undefined;

    // Helper encoder function based on format and quality
    const encodeBuffer = async (input: Buffer, q: number, fast: boolean = false) => {
      let inst = sharp(input);
      if (normalizedFormat === "avif") {
        inst = inst.avif({
          quality: q,
          effort: fast ? 2 : 4,
          chromaSubsampling: targetSizeKb ? "4:2:0" : "4:4:4",
        });
      } else if (normalizedFormat === "webp") {
        inst = inst.webp({
          quality: q,
          effort: fast ? 2 : 4,
        });
      } else if (normalizedFormat === "jpeg") {
        inst = inst.jpeg({
          quality: q,
          mozjpeg: true,
        });
      } else {
        // PNG
        inst = inst.png({
          compressionLevel: 8,
          palette: q < 80,
        });
      }
      return await inst.toBuffer({ resolveWithObject: true });
    };

    // 2. Binary search quality parameter if target file size is set (for lossy formats)
    if (targetSizeKb && targetSizeKb > 0 && normalizedFormat !== "png") {
      const targetSizeBytes = targetSizeKb * 1024;
      const maxQ = Math.max(5, Math.min(100, parsedQuality));
      const minQ = Math.min(20, maxQ);
      let bestQ = minQ;

      let low = minQ;
      let high = maxQ;
      for (let i = 0; i < 5; i++) {
        const midQ = Math.round((low + high) / 2);
        const { data: testBuffer } = await encodeBuffer(intermediateBuffer, midQ, true);

        if (testBuffer.length <= targetSizeBytes) {
          bestQ = midQ;
          low = midQ + 1;
        } else {
          high = midQ - 1;
        }

        if (low > high) break;
      }

      const finalResult = await encodeBuffer(intermediateBuffer, bestQ, false);
      processedBuffer = finalResult.data;
      outputWidth = finalResult.info.width;
      outputHeight = finalResult.info.height;
    } else {
      // Standard single-pass encoding using quality value
      const finalResult = await encodeBuffer(intermediateBuffer, parsedQuality, false);
      processedBuffer = finalResult.data;
      outputWidth = finalResult.info.width;
      outputHeight = finalResult.info.height;
    }

    const mimeType = normalizedFormat === "jpeg" ? "image/jpeg" : `image/${normalizedFormat}`;
    const dataUrl = `data:${mimeType};base64,${processedBuffer.toString("base64")}`;

    return NextResponse.json({
      success: true,
      dataUrl,
      size: processedBuffer.length,
      format: normalizedFormat,
      width: outputWidth,
      height: outputHeight,
    });
  } catch (error: unknown) {
    console.error("Conversion API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred while processing the image.";
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
