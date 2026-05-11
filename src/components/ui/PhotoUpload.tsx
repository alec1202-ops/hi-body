'use client';

import { useRef, useState, ChangeEvent } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { Button } from './Button';

interface PhotoUploadProps {
  onPhoto: (base64: string, mimeType: string, preview: string) => void;
  preview?: string;
  onClear?: () => void;
  label?: string;
}

export function PhotoUpload({ onPhoto, preview, onClear, label = 'Add Photo' }: PhotoUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const base64 = result.split(',')[1];
      const previewUrl = result;
      onPhoto(base64, file.type, previewUrl);
    };
    reader.readAsDataURL(file);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) handleFile(file);
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
