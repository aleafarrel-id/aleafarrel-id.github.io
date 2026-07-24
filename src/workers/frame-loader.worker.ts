/// <reference lib="webworker" />

const MAX_RETRIES = 3;

interface LoadRequest {
  indices: number[];
  framePath: string;
  batchSize: number;
  batchDelay: number;
}

interface FrameMessage {
  index: number;
  bitmap: ImageBitmap | null;
}

async function fetchBitmap(url: string): Promise<ImageBitmap | null> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, { priority: 'low' } as RequestInit);
      if (res.ok) {
        const blob = await res.blob();
        return await createImageBitmap(blob);
      }
      if (attempt < MAX_RETRIES - 1) {
        await new Promise<void>(r => setTimeout(r, 800 * (attempt + 1)));
      }
    } catch {
      if (attempt < MAX_RETRIES - 1) {
        await new Promise<void>(r => setTimeout(r, 800 * (attempt + 1)));
      }
    }
  }
  return null;
}

self.addEventListener('message', async (e: MessageEvent<LoadRequest>) => {
  const { indices, framePath, batchSize, batchDelay } = e.data;

  for (let i = 0; i < indices.length; i += batchSize) {
    const batch = indices.slice(i, i + batchSize);

    await Promise.all(batch.map(async (idx) => {
      const padded = String(idx).padStart(3, '0');
      const url = `${framePath}hero-${padded}.webp`;
      const bitmap = await fetchBitmap(url);

      const msg: FrameMessage = { index: idx, bitmap };
      if (bitmap) {
        (self as DedicatedWorkerGlobalScope).postMessage(msg, [bitmap]);
      } else {
        self.postMessage(msg);
      }
    }));

    if (batchDelay > 0) {
      await new Promise<void>(r => setTimeout(r, batchDelay));
    }
  }

  // Signal completion with index -1
  self.postMessage({ index: -1, bitmap: null } as FrameMessage);
});
