import React, { useState, useEffect } from 'react';
import { RiSave3Line, RiErrorWarningLine, RiCheckLine, RiSettings3Line } from 'react-icons/ri';
import { BiLoader } from 'react-icons/bi';
import { baseUrl, paymentMethods } from '../../../utils/constants';
import { Template as TemplateComponent } from './templates/Template';
import type { Template, Variable } from './templates/types';
import CalendarRestriction from './CalendarRestriction';
import BankDetailsManagement from './BankDetailsManagement';
import type { GeneralSettings, SettingsFormValues } from '../../../types/types';

interface PaymentConfig {
  qr_code: boolean;
  hosted_invoice: boolean;
  manual_charge: boolean;
  manual_transaction_id: boolean;
}

type SettingsTab = 'general' | 'templates' | 'payment' | 'notifications' | 'restriction' | 'bank-details';

export default function Settings() {
  // General settings state
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [initialSettings, setInitialSettings] = useState<GeneralSettings | null>(null);
  const [formValues, setFormValues] = useState<SettingsFormValues | any>({});
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Payment config state
  const [showPaymentConfig, setShowPaymentConfig] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({
    qr_code: true,
    hosted_invoice: true,
    manual_charge: true,
    manual_transaction_id: true
  });
  const [isSavingPaymentConfig, setIsSavingPaymentConfig] = useState(false);

  // Template state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateVariables, setTemplateVariables] = useState<Record<string, Record<string, Variable>>>({});
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

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
        setFormValues({ 
          minStayDays: String(currentSettings.minStayDays),
          taxPercentage: String((currentSettings.taxPercentage || 0) * 100),
          dahuaApiUrl: currentSettings.dahuaApiUrl || '',
          dahuaUsername: currentSettings.dahuaUsername || '',
          dahuaPassword: currentSettings.dahuaPassword || '',
          dahuaIsEnabled: currentSettings.dahuaIsEnabled || false,
          dahuaGateId: currentSettings.dahuaGateId || '',
          dahuaLicensePlateExpiryHours: String(currentSettings.dahuaLicensePlateExpiryHours || 24),
          dailyBookingStartTime: currentSettings.dailyBookingStartTime || '00:00'
        });
        setSettingsId(currentSettings.id);

        // Parse payment config
        if (currentSettings.chargePaymentConfig) {
          try {
            const parsedConfig = JSON.parse(currentSettings.chargePaymentConfig);
            setPaymentConfig(parsedConfig);
          } catch (e) {
            console.error('Failed to parse payment config:', e);
            setPaymentConfig({
              qr_code: true,
              hosted_invoice: true,
              manual_charge: true,
              manual_transaction_id: true
            });
          }
        }
      } else {
        setInitialSettings(null);
        setFormValues({ 
          minStayDays: '1',
          taxPercentage: '0',
          dailyBookingStartTime: '00:00'
        }); // Default values if no settings found
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

  const handlePaymentConfigToggle = (methodId: keyof PaymentConfig) => {
    setPaymentConfig(prev => ({
      ...prev,
      [methodId]: !prev[methodId]
    }));
  };

  const handleSavePaymentConfig = async () => {
    setIsSavingPaymentConfig(true);
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
          chargePaymentConfig: JSON.stringify(paymentConfig),
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      setSuccess('Payment configuration updated successfully!');
      setShowPaymentConfig(false);
    } catch (err: any) {
      console.error("Failed to save payment config:", err);
      setError(err.message || 'Failed to save payment configuration.');
    } finally {
      setIsSavingPaymentConfig(false);
    }
  };

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
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
      
      const validTemplates = data.data.map((template: any) => ({
        id: template.id,
        name: template.name || '',
        type: template.type || 'BOOKING_CONFIRMATION',
        subject: template.subject || '',
        html: template.html || '',
        variables: template.variables || {},
        version: template.version || 1,
        isActive: template.isActive || false,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        design: template.design || {
          version: '1.0',
          body: {
            backgroundColor: '#f8fafc',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            lineHeight: '1.5',
            color: '#1f2937'
          },
          blocks: []
        },
      }));

      // Each template already has its own variables in the response
      const templateVariablesMap = validTemplates.reduce((acc: Record<string, Record<string, Variable>>, template: Template) => {
        return {
          ...acc,
          [template.id || '']: template.variables
        };
      }, {});
  
      setTemplateVariables(templateVariablesMap);
      setTemplates(validTemplates);
    } catch (err: any) {
      console.error('Failed to fetch templates:', err);
      setError(err.message || 'Failed to fetch templates');
      setTemplates([]);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  // Template operations
  const handleSaveTemplate = async (templateData: Partial<Template>) => {
    try {
      const method = templateData.id ? 'PUT' : 'POST';
      const url = templateData.id 
        ? `${baseUrl}/admin/email-templates/${templateData.id}`
        : `${baseUrl}/admin/email-templates`;

      // Always send design as a string
      const apiData = {
        ...templateData,
        design: templateData.design ? JSON.stringify(templateData.design) : undefined,
      };
      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });
  
      if (!response.ok) throw new Error('Failed to save template');
  
      await fetchTemplates();
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
      const removedDesign = { ...templateData, design: null };
  
      const response = await fetch(`${baseUrl}/admin/email-templates`, {
        method: 'POST',
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(removedDesign),
      });
  
      if (!response.ok) throw new Error('Failed to duplicate template');
  
      await fetchTemplates();
      setSuccess('Template duplicated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to duplicate template');
      throw err;
    }
  };
 
  useEffect(() => {
    fetchSettings();
    fetchTemplates(); // Fetch templates once when component mounts
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues((prev: any) => ({ ...prev, [name]: value }));
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
          taxPercentage: Number(formValues.taxPercentage) / 100,
          // Dahua Camera Settings
          dahuaApiUrl: formValues.dahuaApiUrl || null,
          dahuaUsername: formValues.dahuaUsername || null,
          dahuaPassword: formValues.dahuaPassword || null,
          dahuaIsEnabled: formValues.dahuaIsEnabled === true,
          dahuaGateId: formValues.dahuaGateId || null,
          dahuaLicensePlateExpiryHours: Number(formValues.dahuaLicensePlateExpiryHours) || 24,
          dailyBookingStartTime: formValues.dailyBookingStartTime || '00:00'
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

  // Tab configuration
  const tabs: { id: SettingsTab; name: string }[] = [
    { id: 'general', name: 'General' },
    { id: 'templates', name: 'Email Templates' },
    { id: 'payment', name: 'Payment' },
    { id: 'notifications', name: 'Notifications' },
    { id: "restriction", name: "Calendar Restriction"},
    { id: "bank-details", name: "Bank Details"}
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">General Settings</h3>
              <div className="bg-white rounded-lg shadow-sm divide-y divide-gray-200">
                {/* Booking Settings Section */}
                <div className="p-6">
                  <h4 className="text-base font-medium text-gray-900 mb-4">Booking Settings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="minStayDaysInput" className="block text-sm font-medium text-gray-700 mb-2">
                        Minimum Stay Days
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
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
                      <p className="mt-2 text-sm text-gray-500">
                        The minimum number of nights required for a booking
                      </p>
                    </div>
                    <div>
                      <label htmlFor="dailyBookingStartTimeInput" className="block text-sm font-medium text-gray-700 mb-2">
                        Daily Booking Start Time
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                          id="dailyBookingStartTimeInput"
                          name="dailyBookingStartTime"
                          type="time"
                          value={formValues.dailyBookingStartTime ?? '00:00'}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled={isLoading}
                        />
                      </div>
                      <p className="mt-2 text-sm text-gray-500">
                        Time when customers can start booking for the current date (Italian time)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pricing Settings Section */}
                <div className="p-6">
                  <h4 className="text-base font-medium text-gray-900 mb-4">Pricing Settings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="taxPercentageInput" className="block text-sm font-medium text-gray-700 mb-2">
                        Tax Percentage
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                          id="taxPercentageInput"
                          name="taxPercentage"
                          type="number"
                          value={formValues.taxPercentage ?? ''}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                          max="100"
                          step="0.01"
                          disabled={isLoading}
                          placeholder="e.g., 20"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">%</span>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-gray-500">
                        Tax rate applied to bookings (as a percentage)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Configuration Section */}
                <div className="p-6">
                  <h4 className="text-base font-medium text-gray-900 mb-4">Payment Configuration</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-700">Configure which payment methods are available for charges</p>
                      <p className="text-xs text-gray-500 mt-1">Control which payment options customers can use</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPaymentConfig(true)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <RiSettings3Line className="w-4 h-4 mr-2" />
                      Configure Payment Methods
                    </button>
                  </div>
                </div>

                {/* Dahua Camera Configuration Section */}
                <div className="p-6">
                  <h4 className="text-base font-medium text-gray-900 mb-4">Dahua Camera Integration</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-700">Enable automatic gate access via license plate recognition</p>
                        <p className="text-xs text-gray-500 mt-1">Automatically add/remove license plates for guest access</p>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="dahuaIsEnabled"
                          name="dahuaIsEnabled"
                          checked={formValues.dahuaIsEnabled === true}
                          onChange={(e) => {
                            setFormValues((prev: any) => ({
                              ...prev,
                              dahuaIsEnabled: e.target.checked
                            }));
                            setSuccess(null);
                            setError(null);
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="dahuaIsEnabled" className="ml-2 text-sm text-gray-700">
                          Enable Dahua Integration
                        </label>
                      </div>
                    </div>

                    {formValues.dahuaIsEnabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <label htmlFor="dahuaApiUrl" className="block text-sm font-medium text-gray-700 mb-2">
                            Dahua API URL
                          </label>
                          <input
                            id="dahuaApiUrl"
                            name="dahuaApiUrl"
                            type="url"
                            value={formValues.dahuaApiUrl || ''}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="https://camera-ip:port"
                            disabled={isLoading}
                          />
                        </div>

                        <div>
                          <label htmlFor="dahuaGateId" className="block text-sm font-medium text-gray-700 mb-2">
                            Gate ID
                          </label>
                          <input
                            id="dahuaGateId"
                            name="dahuaGateId"
                            type="text"
                            value={formValues.dahuaGateId || ''}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="1"
                            disabled={isLoading}
                          />
                        </div>

                        <div>
                          <label htmlFor="dahuaUsername" className="block text-sm font-medium text-gray-700 mb-2">
                            Username
                          </label>
                          <input
                            id="dahuaUsername"
                            name="dahuaUsername"
                            type="text"
                            value={formValues.dahuaUsername || ''}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="admin"
                            disabled={isLoading}
                          />
                        </div>

                        <div>
                          <label htmlFor="dahuaPassword" className="block text-sm font-medium text-gray-700 mb-2">
                            Password
                          </label>
                          <input
                            id="dahuaPassword"
                            name="dahuaPassword"
                            type="password"
                            value={formValues.dahuaPassword || ''}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="••••••••"
                            disabled={isLoading}
                          />
                        </div>

                        <div>
                          <label htmlFor="dahuaLicensePlateExpiryHours" className="block text-sm font-medium text-gray-700 mb-2">
                            License Plate Expiry (hours)
                          </label>
                          <input
                            id="dahuaLicensePlateExpiryHours"
                            name="dahuaLicensePlateExpiryHours"
                            type="number"
                            value={formValues.dahuaLicensePlateExpiryHours || ''}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            min="1"
                            max="168"
                            placeholder="24"
                            disabled={isLoading}
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Hours after checkout to automatically remove license plate
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Config Popover */}
            {showPaymentConfig && (
              <div className="fixed inset-0 bg-gray-600/40 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Payment Methods Configuration</h3>
                      <button
                        onClick={() => setShowPaymentConfig(false)}
                        className="text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {paymentMethods.map(method => (
                        <div key={method.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{method.title}</p>
                            <p className="text-sm text-gray-500">{method.description}</p>
                          </div>
                          <div className="ml-4">
                            <button
                              type="button"
                              onClick={() => handlePaymentConfigToggle(method.id as keyof PaymentConfig)}
                              className={`cursor-pointer relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                paymentConfig[method.id as keyof PaymentConfig] ? 'bg-blue-600' : 'bg-gray-200'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  paymentConfig[method.id as keyof PaymentConfig] ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                      <button
                        type="button"
                        onClick={() => setShowPaymentConfig(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer "
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSavePaymentConfig}
                        disabled={isSavingPaymentConfig}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer  focus:ring-blue-500 disabled:opacity-50"
                      >
                        {isSavingPaymentConfig ? (
                          <BiLoader className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <RiSave3Line className="w-4 h-4 mr-2" />
                        )}
                        {isSavingPaymentConfig ? 'Saving...' : 'Save Configuration'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'templates':
        return (
          <TemplateComponent 
            templates={templates}
            templateVariables={templateVariables}
            onSaveTemplate={handleSaveTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onDuplicateTemplate={handleDuplicateTemplate}
            isLoading={isLoadingTemplates}
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
        case 'restriction':
        return (
          <div className="space-y-6">
            <div>
              <div>
                <CalendarRestriction />
              </div>
            </div>
          </div>
        );
      case 'bank-details':
        return <BankDetailsManagement />;
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
