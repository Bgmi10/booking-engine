import React from 'react';
import { type Variable } from '../../../types';

interface VariableBlockProps {
  content: {
    variableName?: string;
    fallback?: string;
  };
  styles: Record<string, any>;
  onChange: (updates: { content: any; styles: Record<string, any> }) => void;
  variables: Record<string, Variable>;
  activeVariable: string | null;
  onVariableSelect: (variableName: string | null) => void;
}

export const VariableBlock: React.FC<VariableBlockProps> = ({
  content,
  styles,
  onChange,
  variables,
  onVariableSelect,
}) => {
  const handleInputChange = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
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

  const selectedVariable = content.variableName ? variables[content.variableName] : null;

  return (
    <div className="space-y-4">
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start">
          <div className="flex-1">
            <div className="text-sm font-medium text-blue-900">
              {content.variableName ? (
                <>
                  <span className="font-mono">{'{{'}</span>
                  {content.variableName}
                  <span className="font-mono">{'}}'}</span>
                </>
              ) : (
                'Select a variable'
              )}
            </div>
            {selectedVariable && (
              <div className="mt-1 text-xs text-blue-700">
                {selectedVariable.description}
              </div>
            )}
          </div>
          {selectedVariable && (
            <div className="ml-4 px-2 py-1 bg-blue-100 rounded text-xs text-blue-800">
              {selectedVariable.type}
            </div>
          )}
        </div>
        {content.fallback && (
          <div className="mt-2 text-sm text-blue-700">
            Fallback: {content.fallback}
          </div>
        )}
      </div>

      {/* Variable Settings */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Variable
          </label>
          <select
            value={content.variableName || ''}
            onChange={(e) => {
              handleInputChange('variableName')(e);
              onVariableSelect(e.target.value || null);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Select a variable</option>
            {Object.entries(variables).map(([name, variable]) => (
              <option key={name} value={name}>
                {name} ({variable.type})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fallback Text
          </label>
          <input
            type="text"
            value={content.fallback || ''}
            onChange={handleInputChange('fallback')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Default value if variable is empty"
          />
        </div>
      </div>

      {/* Variable Styles */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Font Size
          </label>
          <select
            value={styles.fontSize || 'inherit'}
            onChange={(e) => handleStyleChange('fontSize', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="inherit">Inherit</option>
            <option value="12px">Small</option>
            <option value="14px">Medium</option>
            <option value="16px">Large</option>
            <option value="18px">Extra Large</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Color
          </label>
          <input
            type="color"
            value={styles.color || '#000000'}
            onChange={(e) => handleStyleChange('color', e.target.value)}
            className="h-9 w-full p-0 border border-gray-300 rounded"
          />
        </div>
      </div>
    </div>
  );
}; 