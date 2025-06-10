import React, { useState, useEffect } from 'react';
import { RiSave3Line, RiErrorWarningLine, RiCheckLine } from 'react-icons/ri';
import { BiLoader } from 'react-icons/bi';
import { baseUrl } from '../../../utils/constants';
import { TemplateEditor } from './templates/TemplateEditor';
import { TemplateList } from './templates/TemplateList';
import type { Template } from './templates/types';

interface GeneralSettings { // Represents the actual data structure from/to the backend
  id: string;
  minStayDays: number;
  // Add other settings properties here as they are defined in the backend model
}

// Represents the state of the form inputs, typically strings
interface SettingsFormValues {
  minStayDays?: string;
  // Add other settings form fields here, e.g., someOtherSetting?: string;
}

type SettingsTab = 'general' | 'templates' | 'payment' | 'notifications';

const TEMPLATE_VARIABLES = [
  {
    name: 'customerDetails.firstName',
    type: 'string',
    description: 'Customer first name',
    example: 'John',
  },
  {
    name: 'customerDetails.lastName',
    type: 'string',
    description: 'Customer last name',
    example: 'Doe',
  },
  {
    name: 'bookingDetails.checkIn',
    type: 'date',
    description: 'Check-in date',
    example: '2024-03-20',
  },
  {
    name: 'bookingDetails.checkOut',
    type: 'date',
    description: 'Check-out date',
    example: '2024-03-25',
  },
  {
    name: 'bookingDetails.totalAmount',
    type: 'number',
    description: 'Total booking amount',
    example: 1000,
  },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [initialSettings, setInitialSettings] = useState<GeneralSettings | null>(null);
  const [formValues, setFormValues] = useState<SettingsFormValues>({});
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Template state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);

  const fetchSettings = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`${baseUrl}/admin/settings`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        const currentSettings = data.data[0] as GeneralSettings;
        setInitialSettings(currentSettings);
        setFormValues({ minStayDays: String(currentSettings.minStayDays) });
        setSettingsId(currentSettings.id);
      } else {
        setInitialSettings(null);
        setFormValues({ minStayDays: '1' }); // Default to '1' if no settings found
        setSettingsId(null);
      }
    } catch (err: any) {
      console.error("Failed to fetch settings:", err);
      setError(err.message || 'Failed to fetch settings.');
      setInitialSettings(null); 
      setFormValues({});
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTemplates = async () => {
    setError(null);
    try {
      const response = await fetch(`${baseUrl}/admin/email-templates`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data || !data.data) {
        throw new Error('Invalid response format from server');
      }
      
      // Ensure each template has the required fields
      const validTemplates = data.data.map((template: any) => ({
        id: template.id,
        name: template.name || '',
        type: template.type || 'BOOKING_CONFIRMATION',
        subject: template.subject || '',
        html: template.html || '',
        variables: template.variables || [],
        version: template.version || 1,
        isActive: template.isActive || false,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        design: template.design || null,
      }));
      
      setTemplates(validTemplates);
    } catch (err: any) {
      console.error('Failed to fetch templates:', err);
      setError(err.message || 'Failed to fetch templates');
      setTemplates([]); // Reset templates on error
    }
  };

  useEffect(() => {
   (async () => {
     await Promise.all([fetchSettings(), fetchTemplates()]);
   })();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
    setSuccess(null);
    setError(null);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsId) {
      setError("Settings ID is missing");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${baseUrl}/admin/settings`, {
        method: 'PUT',
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: settingsId,
          minStayDays: Number(formValues.minStayDays),
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const updatedSettingsData = await response.json();
      setInitialSettings(updatedSettingsData.data);
      setSuccess('Settings updated successfully!');
    } catch (err: any) {
      console.error("Failed to save settings:", err);
      setError(err.message || 'Failed to save settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTemplate = async (templateData: Partial<Template>) => {
    try {
      const method = selectedTemplate?.id ? 'PUT' : 'POST';
      const url = selectedTemplate?.id 
        ? `${baseUrl}/admin/email-templates/${selectedTemplate.id}`
        : `${baseUrl}/admin/email-templates`;

      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) throw new Error('Failed to save template');

      await fetchTemplates();
      setSelectedTemplate(null);
      setIsCreatingTemplate(false);
      setSuccess('Template saved successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to save template');
      throw err;
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`${baseUrl}/admin/email-templates/${templateId}`, {
        method: 'DELETE',
        credentials: "include",
      });

      if (!response.ok) throw new Error('Failed to delete template');

      await fetchTemplates();
      setSuccess('Template deleted successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to delete template');
      throw err;
    }
  };

  const handleDuplicateTemplate = async (template: Template) => {
    try {
      const { id, ...templateData } = template;
      templateData.name = `${templateData.name} (Copy)`;
      templateData.isActive = false;

      const response = await fetch(`${baseUrl}/admin/email-templates`, {
        method: 'POST',
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) throw new Error('Failed to duplicate template');

      await fetchTemplates();
      setSuccess('Template duplicated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to duplicate template');
      throw err;
    }
  };

  // Tab configuration
  const tabs: { id: SettingsTab; name: string }[] = [
    { id: 'general', name: 'General' },
    { id: 'templates', name: 'Email Templates' },
    { id: 'payment', name: 'Payment' },
    { id: 'notifications', name: 'Notifications' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">General Settings</h3>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label htmlFor="minStayDaysInput" className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Stay Days
                    </label>
                    <input
                      id="minStayDaysInput"
                      name="minStayDays"
                      type="number"
                      value={formValues.minStayDays ?? ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                      disabled={isLoading}
                      placeholder="e.g., 1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'templates':
        return selectedTemplate || isCreatingTemplate ? (
          <TemplateEditor
            initialData={selectedTemplate || undefined}
            onSave={handleSaveTemplate}
            variables={TEMPLATE_VARIABLES}
          />
        ) : (
          <TemplateList
            templates={templates}
            onEdit={setSelectedTemplate}
            onDelete={handleDeleteTemplate}
            onDuplicate={handleDuplicateTemplate}
            onCreateNew={() => setIsCreatingTemplate(true)}
          />
        );
      case 'payment':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Settings</h3>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <p className="text-gray-500 text-sm">Payment settings will be available soon.</p>
              </div>
            </div>
          </div>
        );
      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Settings</h3>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <p className="text-gray-500 text-sm">Notification settings will be available soon.</p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (isLoading && !initialSettings && !error) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="p-8 w-full max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <BiLoader className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="p-8 w-full mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4 md:mb-0">
            Settings
          </h1>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6">
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md">
              <RiErrorWarningLine className="flex-shrink-0" />
              <p>{error}</p>
            </div>
          </div>
        )}
        {success && (
          <div className="mb-6">
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-md">
              <RiCheckLine className="flex-shrink-0" />
              <p>{success}</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <form onSubmit={handleSaveSettings}>
          {renderTabContent()}

          {/* Save Button - Only show for general settings */}
          {activeTab === 'general' && (
            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={isLoading || !settingsId}
                className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                  ${isLoading || !settingsId
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  }`}
              >
                {isLoading ? (
                  <BiLoader className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <RiSave3Line className="w-5 h-5 mr-2" />
                )}
                {isLoading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
