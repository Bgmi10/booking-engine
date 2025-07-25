import React, { useState } from 'react';
import { RiAddLine, RiEditLine, RiDeleteBinLine, RiFileCopyLine } from 'react-icons/ri';
import { type Template, TEMPLATE_TYPES } from './types';
interface TemplateListProps {
  templates: Template[];
  onEdit: (template: Template) => void;
  onDelete: (templateId: string) => Promise<void>;
  onDuplicate: (template: Template) => Promise<void>;
  onCreateNew: () => void;
}

export const TemplateList: React.FC<TemplateListProps> = ({
  onEdit,
  onDelete,
  onDuplicate,
  onCreateNew,
  templates,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const handleDelete = async (template: Template) => {
    if (!template.id) return;
    
    if (window.confirm(`Are you sure you want to delete "${template.name}"?`)) {
      setDeletingId(template.id);
      try {
        await onDelete(template.id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleDuplicate = async (template: Template) => {
    if (!template.id) return;
    
    setDuplicatingId(template.id);
    try {
      await onDuplicate(template);
    } finally {
      setDuplicatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Email Templates</h2>
        <button
          onClick={onCreateNew}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <RiAddLine className="w-5 h-5 mr-2" />
          New Template
        </button>
      </div>

      {/* Templates List */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Updated
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {templates.map((template) => (
              <tr key={template.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{template.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {TEMPLATE_TYPES[template.type as keyof typeof TEMPLATE_TYPES]?.label || template.type}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${template.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {template.isActive ? 'Active' : 'Draft'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(template.updatedAt || '').toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => onEdit(template)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <RiEditLine className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDuplicate(template)}
                      disabled={duplicatingId === template.id}
                      className={`text-gray-600 hover:text-gray-900 ${
                        duplicatingId === template.id ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <RiFileCopyLine className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(template)}
                      disabled={deletingId === template.id}
                      className={`text-red-600 hover:text-red-900 ${
                        deletingId === template.id ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <RiDeleteBinLine className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {templates.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                  No templates found. Click "New Template" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}; 