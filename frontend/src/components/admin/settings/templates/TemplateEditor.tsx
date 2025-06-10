import React, { useState } from 'react';
import { RiSave3Line } from 'react-icons/ri';
import type { Variable, Template } from './types';

interface TemplateEditorProps {
  initialData?: Template;
  onSave: (template: Partial<Template>) => Promise<void>;
  variables: Variable[];
}

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  initialData,
  onSave,
  variables,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [subject, setSubject] = useState(initialData?.subject || '');
  const [html, setHtml] = useState(initialData?.html || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Template name is required');
      return;
    }

    if (!subject.trim()) {
      setError('Subject line is required');
      return;
    }

    if (!html.trim()) {
      setError('Template content is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave({
        name,
        subject,
        html,
        type: initialData?.type || 'BOOKING_CONFIRMATION',
        version: initialData?.version || 1,
        isActive: initialData?.isActive || false,
        variables: initialData?.variables || [],
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save template');
      console.error('Failed to save template:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Function to insert variable at cursor position
  const insertVariable = (variable: Variable) => {
    const textarea = document.getElementById('template-html') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = textarea.value;
    const newValue = currentValue.substring(0, start) + 
                    `{{${variable.name}}}` + 
                    currentValue.substring(end);
    
    setHtml(newValue);
    
    // Reset cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + variable.name.length + 4,
        start + variable.name.length + 4
      );
    }, 0);
  };

  return (
    <div className="space-y-6 bg-white rounded-lg shadow-sm">
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Template Name & Subject */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 p-6 border-b border-gray-200">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Template Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter template name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject Line
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setError(null);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter email subject"
          />
        </div>
      </div>

      {/* Editor Controls */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Template Content</h3>
          <div className="flex space-x-4">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {previewMode ? 'Edit Mode' : 'Preview Mode'}
            </button>
          </div>
        </div>

        {/* Variables List */}
        {!previewMode && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Available Variables
            </label>
            <div className="flex flex-wrap gap-2">
              {variables.map((variable) => (
                <button
                  key={variable.name}
                  onClick={() => insertVariable(variable)}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  title={variable.description}
                >
                  {variable.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Editor/Preview Area */}
        <div className="mt-4">
          {previewMode ? (
            <div className="border rounded-md p-4 bg-white">
              <div dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          ) : (
            <textarea
              id="template-html"
              value={html}
              onChange={(e) => {
                setHtml(e.target.value);
                setError(null);
              }}
              className="w-full h-[600px] px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="Enter your HTML template here..."
            />
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="p-6 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
            ${isSaving 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
        >
          <RiSave3Line className="w-5 h-5 mr-2" />
          {isSaving ? 'Saving...' : 'Save Template'}
        </button>
      </div>
    </div>
  );
}; 


