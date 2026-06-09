'use client';

import { useRef, useState, ChangeEvent } from 'react';
import { Camera, X } from 'lucide-react';

interface PhotoUploadProps {
  onPhoto: (base64: string, mimeType: string, preview: string) => void;
  preview?: string;
  onClear?: () => void;
  label?: string;
}

/** Convert any image file (including HEIC/HEIF) to JPEG via Canvas. */
async function fileToJpegBase64(file: File): Promise<{ base64: string; mimeType: string; previewUrl: string }> {
  const isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    file.name.toLowerCase().endsWith('.heic') ||
    file.name.toLowerCase().endsWith('.heif');

  if (isHeic) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { URL.revokeObjectURL(objectUrl); reject(new Error('Canvas not available')); return; }
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(objectUrl);
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('Conversion failed')); return; }
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = e.target!.result as string;
            resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg', previewUrl: dataUrl });
          };
          reader.readAsDataURL(blob);
        }, 'image/jpeg', 0.92);
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('HEIC decode failed')); };
      img.src = objectUrl;
    });
  }

  // Standard formats
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target!.result as string;
      resolve({ base64: dataUrl.split(',')[1], mimeType: file.type || 'image/jpeg', previewUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  });
}

export function PhotoUpload({ onPhoto, preview, onClear, label = 'Add Photo' }: PhotoUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File) {
    try {
      const { base64, mimeType, previewUrl } = await fileToJpegBase64(file);
      onPhoto(base64, mimeType, previewUrl);
    } catch {
      // fallback: read as-is
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        onPhoto(dataUrl.split(',')[1], file.type || 'image/jpeg', dataUrl);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/') || file?.name.toLowerCase().match(/\.(heic|heif)$/)) handleFile(file);
  }

  if (preview) {
    return (
      <div className="relative w-full">
        <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
        {onClear && (
          <button
            onClick={onClear}
            className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
          >
            <X size={16} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={() => fileRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`w-full h-36 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors
        ${dragging ? 'border-emerald-400 bg-emerald-950/30' : 'border-gray-600 hover:border-emerald-500 hover:bg-gray-700/50'}`}
    >
      <Camera size={28} className="text-gray-400" />
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-xs text-gray-400">點擊上傳或拖放圖片</span>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
