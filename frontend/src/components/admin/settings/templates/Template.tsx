import { useState } from "react";
import { VisualEmailEditor } from "./TemplateEditor"
import { TemplateList } from "./TemplateList"
import type { Variable, Template as TemplateType } from "./types";

interface TemplateProps {
  templates: TemplateType[];
  templateVariables: Record<string, Record<string, Variable>>;
  onSaveTemplate: (template: Partial<TemplateType>) => Promise<void>;
  onDeleteTemplate: (templateId: string) => Promise<void>;
  onDuplicateTemplate: (template: TemplateType) => Promise<void>;
  isLoading: boolean;
}

export const Template = ({
  templates,
  templateVariables,
  onSaveTemplate,
  onDeleteTemplate,
  onDuplicateTemplate,
  isLoading
}: TemplateProps) => {
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null);
    const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);

    const handleBack = () => {
      setSelectedTemplate(null);
      setIsCreatingTemplate(false);
    };

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    return (
        <div>
           {selectedTemplate || isCreatingTemplate ? (
            <VisualEmailEditor
              initialData={selectedTemplate || undefined}
              //@ts-ignore
              onSave={async (template) => {
                await onSaveTemplate(template);
                handleBack();
              }}
              variables={selectedTemplate ? templateVariables[selectedTemplate.id || ''] || {} : {}}
              onBack={handleBack}
            /> 
          ) : (
            <TemplateList
              templates={templates}
              onEdit={setSelectedTemplate}
              onDelete={onDeleteTemplate}
              onDuplicate={onDuplicateTemplate}
              onCreateNew={() => setIsCreatingTemplate(true)}
            />
          )}
        </div>
    );
};

