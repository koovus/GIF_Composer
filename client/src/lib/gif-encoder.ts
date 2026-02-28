export class GifEncoder {
  private width: number;
  private height: number;
  private frames: ImageData[] = [];
  private delays: number[] = [];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  addFrame(imageData: ImageData, delay: number = 100) {
    this.frames.push(imageData);
    this.delays.push(delay);
  }

  encode(): Blob {
    const bytes: number[] = [];

    this.writeHeader(bytes);
    this.writeLogicalScreenDescriptor(bytes);
    this.writeGlobalColorTable(bytes);
    this.writeNetscapeExtension(bytes);

    for (let i = 0; i < this.frames.length; i++) {
      const { indexedPixels, colorTable } = this.quantizeFrame(this.frames[i]);
      this.writeGraphicControlExtension(bytes, this.delays[i]);
      this.writeImageDescriptor(bytes);
      this.writeLocalColorTable(bytes, colorTable);
      this.writeLZW(bytes, indexedPixels, 8);
    }

    bytes.push(0x3b);
    return new Blob([new Uint8Array(bytes)], { type: "image/gif" });
  }

  private writeHeader(bytes: number[]) {
    const header = "GIF89a";
    for (let i = 0; i < header.length; i++) {
      bytes.push(header.charCodeAt(i));
    }
  }

  private writeLogicalScreenDescriptor(bytes: number[]) {
    bytes.push(this.width & 0xff, (this.width >> 8) & 0xff);
    bytes.push(this.height & 0xff, (this.height >> 8) & 0xff);
    bytes.push(0xf7);
    bytes.push(0);
    bytes.push(0);
  }

  private writeGlobalColorTable(bytes: number[]) {
    for (let i = 0; i < 256; i++) {
      bytes.push(i, i, i);
    }
  }

  private writeNetscapeExtension(bytes: number[]) {
    bytes.push(0x21, 0xff, 0x0b);
    const id = "NETSCAPE2.0";
    for (let i = 0; i < id.length; i++) {
      bytes.push(id.charCodeAt(i));
    }
    bytes.push(0x03, 0x01, 0x00, 0x00, 0x00);
  }

  private writeGraphicControlExtension(bytes: number[], delay: number) {
    const d = Math.round(delay / 10);
    bytes.push(0x21, 0xf9, 0x04, 0x08);
    bytes.push(d & 0xff, (d >> 8) & 0xff);
    bytes.push(0x00, 0x00);
  }

  private writeImageDescriptor(bytes: number[]) {
    bytes.push(0x2c);
    bytes.push(0, 0, 0, 0);
    bytes.push(this.width & 0xff, (this.width >> 8) & 0xff);
    bytes.push(this.height & 0xff, (this.height >> 8) & 0xff);
    bytes.push(0x87);
  }

  private writeLocalColorTable(bytes: number[], colorTable: number[][]) {
    for (let i = 0; i < 256; i++) {
      if (i < colorTable.length) {
        bytes.push(colorTable[i][0], colorTable[i][1], colorTable[i][2]);
      } else {
        bytes.push(0, 0, 0);
      }
    }
  }

  private quantizeFrame(imageData: ImageData): {
    indexedPixels: number[];
    colorTable: number[][];
  } {
    const pixels = imageData.data;
    const colorCounts = new Map<string, { count: number; r: number; g: number; b: number }>();

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i] & 0xf8;
      const g = pixels[i + 1] & 0xf8;
      const b = pixels[i + 2] & 0xf8;
      const key = `${r},${g},${b}`;
      const existing = colorCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        colorCounts.set(key, { count: 1, r, g, b });
      }
    }

    const sorted = Array.from(colorCounts.values()).sort((a, b) => b.count - a.count);
    const colorTable: number[][] = [];
    for (let i = 0; i < Math.min(256, sorted.length); i++) {
      colorTable.push([sorted[i].r, sorted[i].g, sorted[i].b]);
    }
    while (colorTable.length < 256) {
      colorTable.push([0, 0, 0]);
    }

    const indexedPixels: number[] = [];
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i] & 0xf8;
      const g = pixels[i + 1] & 0xf8;
      const b = pixels[i + 2] & 0xf8;
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let j = 0; j < Math.min(256, sorted.length); j++) {
        const dr = r - colorTable[j][0];
        const dg = g - colorTable[j][1];
        const db = b - colorTable[j][2];
        const dist = dr * dr + dg * dg + db * db;
        if (dist === 0) {
          bestIdx = j;
          break;
        }
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = j;
        }
      }
      indexedPixels.push(bestIdx);
    }

    return { indexedPixels, colorTable };
  }

  private writeLZW(bytes: number[], indexedPixels: number[], minCodeSize: number) {
    bytes.push(minCodeSize);

    const clearCode = 1 << minCodeSize;
    const eoiCode = clearCode + 1;
    let codeSize = minCodeSize + 1;
    let nextCode = eoiCode + 1;
    const maxCode = 4096;

    const table = new Map<string, number>();
    for (let i = 0; i < clearCode; i++) {
      table.set(String(i), i);
    }

    const output: number[] = [];
    let bits = 0;
    let bitCount = 0;

    const writeBits = (code: number, size: number) => {
      bits |= code << bitCount;
      bitCount += size;
      while (bitCount >= 8) {
        output.push(bits & 0xff);
        bits >>= 8;
        bitCount -= 8;
      }
    };

    writeBits(clearCode, codeSize);

    let current = String(indexedPixels[0]);

    for (let i = 1; i < indexedPixels.length; i++) {
      const next = String(indexedPixels[i]);
      const combined = current + "," + next;

      if (table.has(combined)) {
        current = combined;
      } else {
        writeBits(table.get(current)!, codeSize);

        if (nextCode < maxCode) {
          table.set(combined, nextCode++);
          if (nextCode > (1 << codeSize) && codeSize < 12) {
            codeSize++;
          }
        } else {
          writeBits(clearCode, codeSize);
          table.clear();
          for (let j = 0; j < clearCode; j++) {
            table.set(String(j), j);
          }
          nextCode = eoiCode + 1;
          codeSize = minCodeSize + 1;
        }

        current = next;
      }
    }

    writeBits(table.get(current)!, codeSize);
    writeBits(eoiCode, codeSize);

    if (bitCount > 0) {
      output.push(bits & 0xff);
    }

    let pos = 0;
    while (pos < output.length) {
      const chunkSize = Math.min(255, output.length - pos);
      bytes.push(chunkSize);
      for (let i = 0; i < chunkSize; i++) {
        bytes.push(output[pos++]);
      }
    }
    bytes.push(0);
  }
}

export async function captureVideoFrames(
  videoUrl: string,
  startTime: number,
  endTime: number,
  width: number,
  height: number,
  fps: number
): Promise<ImageData[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "auto";

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    const frames: ImageData[] = [];
    const interval = 1 / fps;
    let currentTime = startTime;

    video.onloadedmetadata = () => {
      video.currentTime = startTime;
    };

    video.onseeked = () => {
      ctx.drawImage(video, 0, 0, width, height);
      frames.push(ctx.getImageData(0, 0, width, height));

      currentTime += interval;
      if (currentTime <= endTime) {
        video.currentTime = currentTime;
      } else {
        resolve(frames);
      }
    };

    video.onerror = () => reject(new Error("Failed to load video"));
    video.src = videoUrl;
    video.load();
  });
}
