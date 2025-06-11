import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface ImageBlockProps {
  content: {
    src?: string;
    alt?: string;
    link?: string;
  };
  styles: Record<string, any>;
  onChange: (updates: { content: any; styles: Record<string, any> }) => void;
}

export const ImageBlock: React.FC<ImageBlockProps> = ({
  content,
  styles,
  onChange,
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        onChange({
          content: {
            ...content,
            src: reader.result as string,
          },
          styles,
        });
      };
      reader.readAsDataURL(file);
    }
  }, [content, styles, onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    multiple: false,
  });

  const handleInputChange = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    onChange({
      content: {
        ...content,
        [field]: e.target.value,
      },
      styles,
    });
  };

  const handleStyleChange = (property: string, value: string) => {
    onChange({
      content,
      styles: { ...styles, [property]: value },
    });
  };

  return (
    <div className="space-y-4">
      {/* Image Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        {content.src ? (
          <div className="relative">
            <img
              src={content.src}
              alt={content.alt || ''}
              className="max-h-48 mx-auto"
            />
            <p className="mt-2 text-sm text-gray-500">
              Click or drag to replace image
            </p>
          </div>
        ) : (
          <div className="py-8">
            <p className="text-gray-500">
              {isDragActive
                ? 'Drop the image here'
                : 'Click or drag an image here to upload'}
            </p>
          </div>
        )}
      </div>

      {/* Image Settings */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Alt Text
          </label>
          <input
            type="text"
            value={content.alt || ''}
            onChange={handleInputChange('alt')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Image description"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Link URL
          </label>
          <input
            type="url"
            value={content.link || ''}
            onChange={handleInputChange('link')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="https://..."
          />
        </div>
      </div>

      {/* Image Styles */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Width
          </label>
          <select
            value={styles.width || 'auto'}
            onChange={(e) => handleStyleChange('width', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="auto">Auto</option>
            <option value="100%">Full Width</option>
            <option value="75%">75%</option>
            <option value="50%">50%</option>
            <option value="25%">25%</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Alignment
          </label>
          <select
            value={styles.textAlign || 'center'}
            onChange={(e) => handleStyleChange('textAlign', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
      </div>
    </div>
  );
}; 