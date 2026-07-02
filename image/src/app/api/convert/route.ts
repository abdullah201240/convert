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

    const parsedWidth = widthRaw ? parseInt(widthRaw) : 980;
    const parsedHeight = heightRaw ? parseInt(heightRaw) : 1252;
    const parsedQuality = qualityRaw ? parseInt(qualityRaw) : 50;
    const targetSizeKb = targetSizeKbRaw ? parseInt(targetSizeKbRaw) : null;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Process resized & sharpened intermediate image to a fast high-quality JPEG representation
    // This dramatically speeds up reload time in the search loop compared to heavy PNG.
    const intermediateBuffer = await sharp(buffer)
      .rotate() // Auto-rotate correctly using EXIF orientation metadata
      .resize({
        width: parsedWidth,
        height: parsedHeight,
        fit: "inside",
        kernel: "lanczos3",
      })
      .sharpen() // Apply smart sharpen
      .jpeg({ quality: 95 }) // Fast high-quality intermediate representation
      .toBuffer();

    let processedBuffer: Buffer;

    // 2. Binary search quality parameter if target file size is set
    if (targetSizeKb && targetSizeKb > 0) {
      const targetSizeBytes = targetSizeKb * 1024;
      
      // The user-provided quality acts as the maximum quality ceiling.
      // We search from a visual floor of 20 up to the quality cap.
      const maxQ = Math.max(5, Math.min(100, parsedQuality));
      const minQ = Math.min(20, maxQ);
      let bestQ = minQ;

      // Run 5 search iterations using effort: 2 (very fast search)
      let low = minQ;
      let high = maxQ;
      for (let i = 0; i < 5; i++) {
        const midQ = Math.round((low + high) / 2);
        const testBuffer = await sharp(intermediateBuffer)
          .avif({
            quality: midQ,
            effort: 2, // Fast effort inside loop to speed up search
            chromaSubsampling: "4:2:0",
          })
          .toBuffer();

        if (testBuffer.length <= targetSizeBytes) {
          bestQ = midQ; // Found a valid candidate under target bounds!
          low = midQ + 1; // Try to maximize quality further towards the cap
        } else {
          high = midQ - 1; // Exceeded target size -> search lower quality bounds
        }

        if (low > high) break;
      }

      // Encode the final AVIF buffer using our best quality index at high quality (effort: 4)
      processedBuffer = await sharp(intermediateBuffer)
        .avif({
          quality: bestQ,
          effort: 4, // Final high-quality compression pass
          chromaSubsampling: "4:2:0",
        })
        .toBuffer();
    } else {
      // Standard single-pass encoding using quality value
      processedBuffer = await sharp(intermediateBuffer)
        .avif({
          quality: parsedQuality,
          effort: 4,
          chromaSubsampling: "4:4:4",
        })
        .toBuffer();
    }

    const dataUrl = `data:image/avif;base64,${processedBuffer.toString("base64")}`;

    return NextResponse.json({
      success: true,
      dataUrl,
      size: processedBuffer.length,
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
