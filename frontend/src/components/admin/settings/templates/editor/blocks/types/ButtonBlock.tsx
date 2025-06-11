import React from 'react';

interface ButtonBlockProps {
  content: {
    text?: string;
    url?: string;
  };
  styles: Record<string, any>;
  onChange: (updates: { content: any; styles: Record<string, any> }) => void;
}

export const ButtonBlock: React.FC<ButtonBlockProps> = ({
  content,
  styles,
  onChange,
}) => {
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
      {/* Button Preview */}
      <div className="text-center py-4">
        <button
          type="button"
          className="inline-flex items-center justify-center"
          style={{
            backgroundColor: styles.backgroundColor || '#3B82F6',
            color: styles.color || '#FFFFFF',
            padding: `${styles.paddingY || '8px'} ${styles.paddingX || '16px'}`,
            borderRadius: styles.borderRadius || '6px',
            fontSize: styles.fontSize || '16px',
            fontWeight: styles.fontWeight || '500',
            border: styles.border || 'none',
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          {content.text || 'Button Text'}
        </button>
      </div>

      {/* Button Settings */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Button Text
          </label>
          <input
            type="text"
            value={content.text || ''}
            onChange={handleInputChange('text')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Click me"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Link URL
          </label>
          <input
            type="url"
            value={content.url || ''}
            onChange={handleInputChange('url')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="https://..."
          />
        </div>
      </div>

      {/* Button Styles */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Background Color
          </label>
          <input
            type="color"
            value={styles.backgroundColor || '#3B82F6'}
            onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
            className="h-9 w-full p-0 border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Text Color
          </label>
          <input
            type="color"
            value={styles.color || '#FFFFFF'}
            onChange={(e) => handleStyleChange('color', e.target.value)}
            className="h-9 w-full p-0 border border-gray-300 rounded"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Border Radius
          </label>
          <select
            value={styles.borderRadius || '6px'}
            onChange={(e) => handleStyleChange('borderRadius', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="0">None</option>
            <option value="4px">Small</option>
            <option value="6px">Medium</option>
            <option value="8px">Large</option>
            <option value="9999px">Rounded</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Font Size
          </label>
          <select
            value={styles.fontSize || '16px'}
            onChange={(e) => handleStyleChange('fontSize', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="14px">Small</option>
            <option value="16px">Medium</option>
            <option value="18px">Large</option>
            <option value="20px">Extra Large</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Padding X
          </label>
          <select
            value={styles.paddingX || '16px'}
            onChange={(e) => handleStyleChange('paddingX', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="12px">Small</option>
            <option value="16px">Medium</option>
            <option value="24px">Large</option>
            <option value="32px">Extra Large</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Padding Y
          </label>
          <select
            value={styles.paddingY || '8px'}
            onChange={(e) => handleStyleChange('paddingY', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="6px">Small</option>
            <option value="8px">Medium</option>
            <option value="12px">Large</option>
            <option value="16px">Extra Large</option>
          </select>
        </div>
      </div>
    </div>
  );
}; 