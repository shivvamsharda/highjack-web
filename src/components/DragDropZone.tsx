
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
    <div
      className={`drag-drop-zone ${isDragging ? 'dragover' : ''} ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } relative overflow-hidden group`}
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
      
      {imagePreview ? (
        <div className="relative h-48 rounded-lg overflow-hidden">
          <img
            src={imagePreview}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <span className="text-white font-medium">Click or drag to replace</span>
          </div>
        </div>
      ) : (
        <div className="h-48 flex flex-col items-center justify-center text-center p-6">
          <Upload className="w-12 h-12 text-primary mb-4 animate-pulse" />
          <div className="text-lg font-medium text-foreground mb-2">
            Drop your new PFP here
          </div>
          <div className="text-sm text-muted-foreground">
            or <span className="text-primary underline">click to browse</span>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            PNG, JPG, GIF up to 10MB
          </div>
        </div>
      )}
    </div>
  );
};

export default DragDropZone;
