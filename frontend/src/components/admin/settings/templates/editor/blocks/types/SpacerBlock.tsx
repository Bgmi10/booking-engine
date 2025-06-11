import React from 'react';

interface SpacerBlockProps {
  styles: Record<string, any>;
  onChange: (updates: { content: any; styles: Record<string, any> }) => void;
}

export const SpacerBlock: React.FC<SpacerBlockProps> = ({
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
      {/* Spacer Preview */}
      <div
        className="bg-gray-100 rounded"
        style={{
          height: styles.height || '32px',
        }}
      />

      {/* Spacer Settings */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Height
        </label>
        <select
          value={styles.height || '32px'}
          onChange={(e) => handleStyleChange('height', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          <option value="8px">Extra Small (8px)</option>
          <option value="16px">Small (16px)</option>
          <option value="24px">Medium (24px)</option>
          <option value="32px">Large (32px)</option>
          <option value="48px">Extra Large (48px)</option>
          <option value="64px">2x Large (64px)</option>
        </select>
      </div>
    </div>
  );
}; 