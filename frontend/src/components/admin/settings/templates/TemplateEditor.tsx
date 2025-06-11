import React, { useState } from 'react';
import { RiSave3Line, RiArrowLeftLine, RiCodeLine, RiEyeLine } from 'react-icons/ri';
import type { Variable, Template, EmailBlock } from './types';
import { VisualEditor } from './editor/VisualEditor';
import { VariableManager } from './editor/VariableManager';
import { validateTemplate } from './editor/utils/validator';
import { convertToHtml } from './editor/utils/converter';

type EditorMode = 'visual' | 'html' | 'preview';

interface TemplateEditorProps {
  initialData?: Template;
  onSave: (template: Partial<Template>) => Promise<void>;
  variables: Record<string, Variable>;
  onBack: () => void;
}

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  initialData,
  onSave,
  variables,
  onBack,
}) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    subject: initialData?.subject || '',
    html: initialData?.html || '',
    type: initialData?.type || 'BOOKING_CONFIRMATION',
  });

  const [editorMode, setEditorMode] = useState<EditorMode>('visual');
  const [blocks, setBlocks] = useState<EmailBlock[]>(initialData?.design?.blocks || []);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeVariable, setActiveVariable] = useState<string | null>(null);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Template name is required');
      return;
    }

    if (!formData.subject.trim()) {
      setError('Subject line is required');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      // Convert blocks to HTML if in visual mode
      const finalHtml = editorMode === 'visual' ? convertToHtml(blocks) : formData.html;

      // Validate template and variables
      const validationResult = validateTemplate(finalHtml, variables);
      if (!validationResult.isValid) {
        //@ts-ignore
        setError(validationResult.error);
        return;
      }

      await onSave({
        ...formData,
        html: finalHtml,
        type: initialData?.type || 'BOOKING_CONFIRMATION',
        version: initialData?.version || 1,
        isActive: initialData?.isActive || false,
        variables,
        design: {
          version: '1.0',
          blocks,
          body: {
            backgroundColor: '#f8fafc',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            lineHeight: '1.5',
            color: '#1f2937'
          }
        }
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleModeChange = (mode: EditorMode) => {
    if (mode === 'visual' && editorMode === 'html') {
      // Convert HTML to blocks when switching to visual mode
      // This would need a HTML parser implementation
      // setBlocks(parseHtmlToBlocks(formData.html));
    }
    setEditorMode(mode);
  };

  return (
    <div className="space-y-6 bg-white rounded-lg shadow-sm">
      {/* Header with Back Button and Mode Switcher */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <RiArrowLeftLine className="w-5 h-5 mr-1" />
              Back to Templates
            </button>
            <h2 className="text-lg font-medium text-gray-900">
              {initialData ? 'Edit Template' : 'Create New Template'}
            </h2>
          </div>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => handleModeChange('visual')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                editorMode === 'visual'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Visual Editor
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('html')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                editorMode === 'html'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <RiCodeLine className="w-5 h-5" />
              HTML
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('preview')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                editorMode === 'preview'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <RiEyeLine className="w-5 h-5" />
              Preview
            </button>
          </div>
        </div>
      </div>

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
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
            value={formData.subject}
            onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter email subject"
          />
        </div>
      </div>

      {/* Editor Area */}
      <div className="grid grid-cols-12 gap-6">
        {/* Main Editor */}
        <div className="col-span-9">
          <div className="p-6">
            {editorMode === 'visual' && (
              <VisualEditor
                blocks={blocks}
                onBlocksChange={setBlocks}
                variables={variables}
                activeVariable={activeVariable}
                onVariableSelect={setActiveVariable}
              />
            )}
            {editorMode === 'html' && (
              <textarea
                value={formData.html}
                onChange={(e) => setFormData(prev => ({ ...prev, html: e.target.value }))}
                className="w-full h-[600px] px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                placeholder="Enter your HTML template here..."
              />
            )}
            {editorMode === 'preview' && (
              <div className="border rounded-md p-4 bg-white">
                <div 
                  dangerouslySetInnerHTML={{ 
                    //@ts-ignore
                    __html: editorMode === 'visual' ? convertToHtml(blocks) : formData.html 
                  }} 
                />
              </div>
            )}
          </div>
        </div>

        {/* Variable Manager Sidebar */}
        <div className="col-span-3 border-l border-gray-200">
          <VariableManager
            variables={variables}
            activeVariable={activeVariable}
            onVariableSelect={setActiveVariable}
          />
        </div>
      </div>

      {/* Save and Cancel Buttons */}
      <div className="p-6 border-t border-gray-200">
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="button"
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
    </div>
  );
}; 


