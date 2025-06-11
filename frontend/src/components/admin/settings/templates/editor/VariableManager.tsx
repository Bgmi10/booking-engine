import React from 'react';
import { type Variable } from '../types';

interface VariableManagerProps {
  variables: Record<string, Variable>;
  activeVariable: string | null;
  onVariableSelect: (variableName: string | null) => void;
}

export const VariableManager: React.FC<VariableManagerProps> = ({
  variables,
  activeVariable,
  onVariableSelect,
}) => {
  const variableCategories = Object.entries(variables).reduce<Record<string, Variable[]>>(
    (acc, [name, variable]) => {
      const category = name.split('.')[0] || 'general';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({ ...variable, name });
      return acc;
    },
    {}
  );

  return (
    <div className="p-4">
      <h3 className="font-medium text-gray-900 mb-4">Available Variables</h3>
      <div className="space-y-4">
        {Object.entries(variableCategories).map(([category, vars]) => (
          <div key={category}>
            <h4 className="text-sm font-medium text-gray-700 mb-2 capitalize">
              {category}
            </h4>
            <div className="space-y-2">
              {vars.map((variable) => (
                <button
                  key={variable.name}
                  type="button"
                  onClick={() => onVariableSelect(
                    activeVariable === variable.name ? null : variable.name
                  )}
                  className={`w-full text-left p-2 rounded-md text-sm transition-colors ${
                    activeVariable === variable.name
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="font-medium">{variable.name}</div>
                  <div className="text-xs mt-1 text-gray-500">
                    {variable.description}
                  </div>
                  <div className="text-xs mt-1 text-gray-400">
                    Type: {variable.type}
                    {variable.required && ' • Required'}
                  </div>
                  <div className="text-xs mt-1 text-gray-400">
                    Example: {JSON.stringify(variable.example)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 