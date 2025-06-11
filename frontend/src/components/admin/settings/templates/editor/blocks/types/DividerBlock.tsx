import React from 'react';

interface DividerBlockProps {
  styles: Record<string, any>;
  onChange: (updates: { content: any; styles: Record<string, any> }) => void;
}

export const DividerBlock: React.FC<DividerBlockProps> = ({
  styles,
  onChange,
}) => {
  const handleStyleChange = (property: string, value: string) => {
    onChange({
      content: {},
      styles: { ...styles, [property]: value },
    });
  };

  return (
    <div className="space-y-4">
      {/* Divider Preview */}
      <div className="py-4">
        <hr
          style={{
            borderWidth: styles.borderWidth || '1px',
            borderStyle: styles.borderStyle || 'solid',
            borderColor: styles.borderColor || '#E5E7EB',
            margin: `${styles.marginY || '8px'} 0`,
          }}
        />
      </div>

      {/* Divider Settings */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Style
          </label>
          <select
            value={styles.borderStyle || 'solid'}
            onChange={(e) => handleStyleChange('borderStyle', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
            <option value="double">Double</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Width
          </label>
          <select
            value={styles.borderWidth || '1px'}
            onChange={(e) => handleStyleChange('borderWidth', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="1px">Thin</option>
            <option value="2px">Medium</option>
            <option value="4px">Thick</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Color
          </label>
          <input
            type="color"
            value={styles.borderColor || '#E5E7EB'}
            onChange={(e) => handleStyleChange('borderColor', e.target.value)}
            className="h-9 w-full p-0 border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Spacing
          </label>
          <select
            value={styles.marginY || '8px'}
            onChange={(e) => handleStyleChange('marginY', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="4px">Small</option>
            <option value="8px">Medium</option>
            <option value="16px">Large</option>
            <option value="24px">Extra Large</option>
          </select>
        </div>
      </div>
    </div>
  );
}; 