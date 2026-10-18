import { useEffect, useRef } from 'react';
import { cn } from '../../utils/cn';

interface SceneRendererProps {
  data: Float32Array | null;
  width?: number;
  height?: number;
  changeMask?: Float32Array | null;
  showGrid?: boolean;
  className?: string;
}

export function SceneRenderer({
  data,
  width = 256,
  height = 256,
  changeMask,
  showGrid = false,
  className,
}: SceneRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    const imgData = ctx.createImageData(width, height);
    const pixels = imgData.data;

    for (let i = 0; i < width * height; i++) {
      const srcIdx = i * 3;
      const dstIdx = i * 4;

      const r = Math.min(255, Math.max(0, Math.round(data[srcIdx] * 255)));
      const g = Math.min(255, Math.max(0, Math.round(data[srcIdx + 1] * 255)));
      const b = Math.min(255, Math.max(0, Math.round(data[srcIdx + 2] * 255)));

      // If changeMask provided, tint changed pixels red/amber
      if (changeMask && changeMask[i] > 0.05) {
        pixels[dstIdx] = Math.min(255, r + 120);
        pixels[dstIdx + 1] = Math.round(g * 0.4);
        pixels[dstIdx + 2] = Math.round(b * 0.4);
        pixels[dstIdx + 3] = 255;
      } else {
        pixels[dstIdx] = r;
        pixels[dstIdx + 1] = g;
        pixels[dstIdx + 2] = b;
        pixels[dstIdx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Optional 4x4 patch grid overlay
    if (showGrid) {
      ctx.strokeStyle = 'rgba(0, 255, 157, 0.4)';
      ctx.lineWidth = 1;
      const patchSize = width / 4;
      for (let i = 1; i < 4; i++) {
        // Vertical
        ctx.beginPath();
        ctx.moveTo(i * patchSize, 0);
        ctx.lineTo(i * patchSize, height);
        ctx.stroke();

        // Horizontal
        ctx.beginPath();
        ctx.moveTo(0, i * patchSize);
        ctx.lineTo(width, i * patchSize);
        ctx.stroke();
      }
    }
  }, [data, width, height, changeMask, showGrid]);

  return (
    <div className={cn('relative rounded-xl overflow-hidden border border-border-glass bg-space/80 shadow-inner', className)}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-auto block aspect-square object-cover"
      />
    </div>
  );
}
