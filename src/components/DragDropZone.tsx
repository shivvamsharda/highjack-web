
import React, { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';

interface DragDropZoneProps {
  onFileUpload: (file: File) => void;
  imagePreview: string | null;
  disabled?: boolean;
}

const DragDropZone: React.FC<DragDropZoneProps> = ({
  onFileUpload,
  imagePreview,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      onFileUpload(files[0]);
    }
  }, [onFileUpload, disabled]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <div className="forge-input-row">
      <label className={`forge-input-label ${disabled ? 'opacity-50' : ''}`}>
        Image
      </label>
      <span className="forge-colon">:</span>
      <div
        className={`relative flex-1 overflow-hidden rounded-md border transition-all duration-300 ${
          isDragging ? 'border-[#ff719a] shadow-[0_0_18px_rgba(255,67,128,0.45)]' : 'border-[#8f3f5e]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/80'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={disabled}
          className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <div className="flex min-h-11 items-center justify-between gap-3 bg-[rgba(24,9,18,0.8)] px-4 py-2">
          <div className="flex min-w-0 items-center gap-3">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Selected token art"
                className="h-8 w-8 rounded object-cover ring-1 ring-[#ff7ca5]"
              />
            ) : (
              <Upload className="h-4 w-4 text-[#f7c9d7]" />
            )}
            <span className="truncate text-sm font-semibold uppercase tracking-wide text-[#ffdce7]">
              {imagePreview ? 'Image selected' : 'Select file'}
            </span>
          </div>
          <div className="text-[11px] uppercase tracking-wide text-[#b794a2]">
            PNG JPG
          </div>
        </div>
      </div>
    </div>
  );
};

export default DragDropZone;
