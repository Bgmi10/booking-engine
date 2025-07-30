import { useState, useEffect } from "react";
import { 
  RiSettings4Line,
  RiSaveLine,
  RiTimeLine,
  RiCalendarLine,
  RiNotificationLine,
  RiSecurePaymentLine
} from "react-icons/ri";
import { baseUrl } from "../../../utils/constants";

export default function RevenueSettings() {
  const [settings, setSettings] = useState({
    cashCalculationPeriod: "daily",
    italianTimezoneReset: "00:00",
    autoReminders: true,
    reminderTime: "18:00",
    discrepancyThreshold: 10.00,
    autoFinalizeDays: 3,
    paymentMethods: {
      cash: true,
      stripe: true,
      bankTransfer: true
    },
    notifications: {
      managerEmail: true,
      discrepancyAlerts: true,
      dailySummaryEmail: true
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load cash calculation settings
      const cashResponse = await fetch(`${baseUrl}/admin/revenue/cash/settings`, {
        credentials: "include"
      });

      // Load revenue notification settings
      const revenueResponse = await fetch(`${baseUrl}/admin/revenue/settings`, {
        credentials: "include"
      });

      if (cashResponse.ok) {
        const cashData = await cashResponse.json();
        if (cashData.success && cashData.data) {
          setSettings(prevSettings => ({
            ...prevSettings,
            cashCalculationPeriod: cashData.data.calculationPeriodDays === 1 ? "daily" : 
                                  cashData.data.calculationPeriodDays === 7 ? "weekly" : "monthly",
            italianTimezoneReset: cashData.data.resetTime || "00:00"
          }));
        }
      }

      if (revenueResponse.ok) {
        const revenueData = await revenueResponse.json();
        if (revenueData.success && revenueData.data) {
          setSettings(prevSettings => ({
            ...prevSettings,
            autoReminders: revenueData.data.autoReminders || true,
            reminderTime: revenueData.data.reminderTime || "18:00",
            discrepancyThreshold: revenueData.data.discrepancyThreshold || 10.00,
            autoFinalizeDays: revenueData.data.autoFinalizeDays || 3,
            notifications: {
              managerEmail: revenueData.data.managerEmail || true,
              discrepancyAlerts: revenueData.data.discrepancyAlerts || true,
              dailySummaryEmail: revenueData.data.dailySummaryEmail || true
            }
          }));
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save cash calculation settings
      const calculationPeriodDays = settings.cashCalculationPeriod === "daily" ? 1 :
                                   settings.cashCalculationPeriod === "weekly" ? 7 : 30;

      const cashSettingsResponse = await fetch(`${baseUrl}/admin/revenue/cash/settings`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          calculationPeriodDays,
          resetTime: settings.italianTimezoneReset
        })
      });

      // Save revenue notification settings
      const revenueSettingsResponse = await fetch(`${baseUrl}/admin/revenue/settings`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          autoReminders: settings.autoReminders,
          reminderTime: settings.reminderTime,
          discrepancyThreshold: settings.discrepancyThreshold,
          autoFinalizeDays: settings.autoFinalizeDays,
          managerEmail: settings.notifications.managerEmail,
          discrepancyAlerts: settings.notifications.discrepancyAlerts,
          dailySummaryEmail: settings.notifications.dailySummaryEmail
        })
      });

      if (cashSettingsResponse.ok && revenueSettingsResponse.ok) {
        setSaveMessage("Settings saved successfully!");
        setTimeout(() => setSaveMessage(""), 3000);
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (error) {
      setSaveMessage("Failed to save settings. Please try again.");
      setTimeout(() => setSaveMessage(""), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSettingChange = (section: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: typeof prev[section] === 'object' 
        ? { ...prev[section], [key]: value }
        : value
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Revenue Management Settings</h2>
        <p className="text-sm text-gray-500">Configure cash management, calculation periods, and notification preferences</p>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`p-4 rounded-lg ${
          saveMessage.includes("successfully") 
            ? "bg-green-50 border border-green-200 text-green-700"
            : "bg-red-50 border border-red-200 text-red-700"
        }`}>
          {saveMessage}
        </div>
      )}

      {/* Cash Management Settings */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <RiTimeLine className="w-5 h-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Cash Management</h3>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Calculation Period
              </label>
              <select
                value={settings.cashCalculationPeriod}
                onChange={(e) => handleSettingChange("cashCalculationPeriod", "", e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                How often cash summaries are calculated and reset
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Italian Timezone Reset Time
              </label>
              <input
                type="time"
                value={settings.italianTimezoneReset}
                onChange={(e) => handleSettingChange("italianTimezoneReset", "", e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Time when daily calculations reset (Italian timezone)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discrepancy Threshold (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={settings.discrepancyThreshold}
                onChange={(e) => handleSettingChange("discrepancyThreshold", "", parseFloat(e.target.value))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Threshold for automatic discrepancy alerts
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auto-finalize After (days)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={settings.autoFinalizeDays}
                onChange={(e) => handleSettingChange("autoFinalizeDays", "", parseInt(e.target.value))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Days after which summaries are automatically finalized
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <RiSecurePaymentLine className="w-5 h-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Payment Methods</h3>
          </div>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Cash Payments</h4>
                <p className="text-sm text-gray-500">Enable cash payment tracking</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.paymentMethods.cash}
                  onChange={(e) => handleSettingChange("paymentMethods", "cash", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Stripe/Card Payments</h4>
                <p className="text-sm text-gray-500">Enable card payment tracking</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.paymentMethods.stripe}
                  onChange={(e) => handleSettingChange("paymentMethods", "stripe", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Bank Transfers</h4>
                <p className="text-sm text-gray-500">Enable bank transfer tracking</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.paymentMethods.bankTransfer}
                  onChange={(e) => handleSettingChange("paymentMethods", "bankTransfer", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <RiNotificationLine className="w-5 h-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Auto Reminders</h4>
              <p className="text-sm text-gray-500">Send automatic cash collection reminders</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoReminders}
                onChange={(e) => handleSettingChange("autoReminders", "", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {settings.autoReminders && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reminder Time
              </label>
              <input
                type="time"
                value={settings.reminderTime}
                onChange={(e) => handleSettingChange("reminderTime", "", e.target.value)}
                className="block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Time to send daily reminders to managers
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Manager Email Notifications</h4>
                <p className="text-sm text-gray-500">Send email notifications to managers</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.managerEmail}
                  onChange={(e) => handleSettingChange("notifications", "managerEmail", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Discrepancy Alerts</h4>
                <p className="text-sm text-gray-500">Alert when discrepancies exceed threshold</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.discrepancyAlerts}
                  onChange={(e) => handleSettingChange("notifications", "discrepancyAlerts", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Daily Summary Emails</h4>
                <p className="text-sm text-gray-500">Send daily summary reports via email</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.dailySummaryEmail}
                  onChange={(e) => handleSettingChange("notifications", "dailySummaryEmail", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <RiSaveLine className="w-5 h-5 mr-2" />
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}