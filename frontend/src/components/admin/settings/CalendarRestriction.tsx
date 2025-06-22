import React, { useState, useEffect } from 'react';
import { 
  RiAddLine, 
  RiEditLine, 
  RiDeleteBinLine, 
  RiSave3Line, 
  RiCloseLine,
  RiErrorWarningLine,
  RiCheckLine,
} from 'react-icons/ri';
import { BiLoader } from 'react-icons/bi';
import { baseUrl } from '../../../utils/constants';
import type { BookingRestriction, RatePolicy, RestrictionException, Room } from '../../../types/types';

export default function BookingRestrictions() {
    const [restrictions, setRestrictions] = useState<BookingRestriction[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [ratePolicies, setRatePolicies] = useState<RatePolicy[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
    const [editingRestriction, setEditingRestriction] = useState<BookingRestriction | null>(null);
    const [currentException, setCurrentException] = useState<RestrictionException | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

  const initialFormState: BookingRestriction = {
    name: '',
    description: '',
    type: 'CLOSE_TO_STAY',
    startDate: '',
    endDate: '',
    daysOfWeek: [],
    rateScope: 'ALL_RATES',
    ratePolicyIds: [],
    roomScope: 'ALL_ROOMS',
    roomIds: [],
    minLength: undefined,
    maxLength: undefined,
    minAdvance: undefined,
    maxAdvance: undefined,
    sameDayCutoffTime: '',
    priority: 0,
    isActive: true,
    exceptions: []
  };

  const [formData, setFormData] = useState<BookingRestriction>(initialFormState);

  const restrictionTypes = [
    { value: 'CLOSE_TO_STAY', label: 'Close to Stay', description: 'Cannot stay overnight on specified dates' },
    { value: 'CLOSE_TO_ARRIVAL', label: 'Close to Arrival', description: 'Cannot check in on specified dates' },
    { value: 'CLOSE_TO_DEPARTURE', label: 'Close to Departure', description: 'Cannot check out on specified dates' },
    { value: 'MIN_LENGTH', label: 'Minimum Length', description: 'Minimum stay requirement' },
    { value: 'MAX_LENGTH', label: 'Maximum Length', description: 'Maximum stay requirement' },
    { value: 'ADVANCE_BOOKING', label: 'Advance Booking', description: 'Advance booking requirements' }
  ];

  const initialExceptionState: RestrictionException = {
    exceptionDaysOfWeek: [],
    ratePolicyIds: [],
    roomIds: [],
    isActive: true
  };

  const daysOfWeekOptions = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [restrictionsRes, roomsRes, ratePoliciesRes] = await Promise.all([
        fetch(`${baseUrl}/admin/bookings/restrictions/all`, { credentials: "include" }),
        fetch(`${baseUrl}/rooms/all`, { credentials: "include" }),
        fetch(`${baseUrl}/admin/rate-policies/all`, { credentials: "include" })
      ]);

      if (restrictionsRes.ok) {
        const restrictionsData = await restrictionsRes.json();
        setRestrictions(restrictionsData.data || []);
      }

      if (roomsRes.ok) {
        const roomsData = await roomsRes.json();
        setRooms(roomsData.data || []);
      }

      if (ratePoliciesRes.ok) {
        const ratePoliciesData = await ratePoliciesRes.json();
        setRatePolicies(ratePoliciesData.data || []);
      }
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };
  const handleSave = async () => {
    try {
      setError(null);
      const method = editingRestriction ? 'PUT' : 'POST';
      const url = editingRestriction 
        ? `${baseUrl}/admin/bookings/restrictions/${editingRestriction.id}`
        : `${baseUrl}/admin/bookings/restrictions`;

      // Prepare the payload
      const payload = {
        ...formData,
        exceptions: formData.exceptions.map(ex => ({
          ...ex,
          exceptionStartDate: ex.exceptionStartDate || undefined,
          exceptionEndDate: ex.exceptionEndDate || undefined
        }))
      };

      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save restriction');
      }

      setSuccess(editingRestriction ? 'Restriction updated successfully!' : 'Restriction created successfully!');
      setIsModalOpen(false);
      setEditingRestriction(null);
      setFormData(initialFormState);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to save restriction');
    }
  };

  const handleAddException = () => {
    setCurrentException(initialExceptionState);
    setIsExceptionModalOpen(true);
  };

  const handleSaveException = () => {
    if (currentException) {
      setFormData(prev => ({
        ...prev,
        exceptions: [...prev.exceptions, currentException]
      }));
      setIsExceptionModalOpen(false);
      setCurrentException(null);
    }
  };

  const handleEditException = (index: number) => {
    setCurrentException(formData.exceptions[index]);
    setIsExceptionModalOpen(true);
  };

  const handleDeleteException = (index: number) => {
    setFormData(prev => ({
      ...prev,
      exceptions: prev.exceptions.filter((_, i) => i !== index)
    }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this restriction?')) return;

    try {
      const response = await fetch(`${baseUrl}/admin/bookings/restrictions/${id}`, {
        method: 'DELETE',
        credentials: "include"
      });

      if (!response.ok) throw new Error('Failed to delete restriction');

      setSuccess('Restriction deleted successfully!');
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete restriction');
    }
  };

  const handleEdit = (restriction: BookingRestriction) => {
    setEditingRestriction(restriction);
    setFormData({
      ...restriction,
      startDate: restriction.startDate.split('T')[0],
      endDate: restriction.endDate.split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingRestriction(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const handleInputChange = (field: keyof BookingRestriction, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDaysOfWeekChange = (day: number) => {
    setFormData(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day]
    }));
  };

  const handleRoomChange = (roomId: string) => {
    setFormData(prev => ({
      ...prev,
      roomIds: prev.roomIds.includes(roomId)
        ? prev.roomIds.filter(id => id !== roomId)
        : [...prev.roomIds, roomId]
    }));
  };

  const handleRatePolicyChange = (ratePolicyId: string) => {
    setFormData(prev => ({
      ...prev,
      ratePolicyIds: prev.ratePolicyIds.includes(ratePolicyId)
        ? prev.ratePolicyIds.filter(id => id !== ratePolicyId)
        : [...prev.ratePolicyIds, ratePolicyId]
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <BiLoader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 z-50">
         {isExceptionModalOpen && (
    <ExceptionModal 
      exception={currentException}
      setException={setCurrentException}
      onSave={handleSaveException}
      onClose={() => setIsExceptionModalOpen(false)}
      rooms={rooms}
      ratePolicies={ratePolicies}
      daysOfWeekOptions={daysOfWeekOptions}
    />
  )}
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Booking Restrictions</h3>
          <p className="text-sm text-gray-500 mt-1">Manage booking restrictions and rules</p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <RiAddLine className="w-4 h-4 mr-2" />
          Add Restriction
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md">
          <RiErrorWarningLine className="flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-md">
          <RiCheckLine className="flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {/* Restrictions List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Range</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {restrictions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No restrictions found. Create your first restriction to get started.
                  </td>
                </tr>
              ) : (
                restrictions.map((restriction) => (
                  <tr key={restriction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{restriction.name}</div>
                        {restriction.description && (
                          <div className="text-sm text-gray-500">{restriction.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {restrictionTypes.find(t => t.value === restriction.type)?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(restriction.startDate).toLocaleDateString()} - {new Date(restriction.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        restriction.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {restriction.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {restriction.priority}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(restriction)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <RiEditLine className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(restriction.id!)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <RiDeleteBinLine className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 bg-opacity-50 overflow-y-auto h-full w-full ">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingRestriction ? 'Edit Restriction' : 'Create New Restriction'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <RiCloseLine className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6 max-h-96 overflow-y-auto">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Restriction name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {restrictionTypes.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Optional description"
                />
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Days of Week */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Days of Week</label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeekOptions.map((day) => (
                    <label key={day.value} className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.daysOfWeek.includes(day.value)}
                        onChange={() => handleDaysOfWeekChange(day.value)}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Room Scope */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Room Scope</label>
                <select
                  value={formData.roomScope}
                  onChange={(e) => handleInputChange('roomScope', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
                >
                  <option value="ALL_ROOMS">All Rooms</option>
                  <option value="SPECIFIC_ROOMS">Specific Rooms</option>
                </select>

                {formData.roomScope === 'SPECIFIC_ROOMS' && (
                  <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-3">
                    {rooms.map((room) => (
                      <label key={room.id} className="flex items-center mb-2 last:mb-0">
                        <input
                          type="checkbox"
                          checked={formData.roomIds.includes(room.id)}
                          onChange={() => handleRoomChange(room.id)}
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-700">{room.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Rate Scope */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rate Scope</label>
                <select
                  value={formData.rateScope}
                  onChange={(e) => handleInputChange('rateScope', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
                >
                  <option value="ALL_RATES">All Rates</option>
                  <option value="SPECIFIC_RATES">Specific Rates</option>
                  <option value="BASE_RATE">Base Rate Only</option>
                </select>

                {formData.rateScope === 'SPECIFIC_RATES' && (
                  <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-3">
                    {ratePolicies.map((ratePolicy) => (
                      <label key={ratePolicy.id} className="flex items-center mb-2 last:mb-0">
                        <input
                          type="checkbox"
                          checked={formData.ratePolicyIds.includes(ratePolicy.id)}
                          onChange={() => handleRatePolicyChange(ratePolicy.id)}
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-700">{ratePolicy.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Length & Advance Restrictions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Length (nights)</label>
                  <input
                    type="number"
                    value={formData.minLength || ''}
                    onChange={(e) => handleInputChange('minLength', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Length (nights)</label>
                  <input
                    type="number"
                    value={formData.maxLength || ''}
                    onChange={(e) => handleInputChange('maxLength', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Advance (hours)</label>
                  <input
                    type="number"
                    value={formData.minAdvance || ''}
                    onChange={(e) => handleInputChange('minAdvance', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Advance (days)</label>
                  <input
                    type="number"
                    value={formData.maxAdvance || ''}
                    onChange={(e) => handleInputChange('maxAdvance', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                  />
                </div>
              </div>

              {/* Additional Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Same Day Cutoff Time</label>
                  <input
                    type="time"
                    value={formData.sameDayCutoffTime || ''}
                    onChange={(e) => handleInputChange('sameDayCutoffTime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => handleInputChange('priority', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">Active</span>
              </div>
            </div>
            <div className="mt-4">
    <h4 className="text-sm font-medium text-gray-700 mb-2">Exceptions</h4>
    <button
      onClick={handleAddException}
      className="mb-2 inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700"
    >
      <RiAddLine className="w-3 h-3 mr-1" />
      Add Exception
    </button>
    
    {formData.exceptions.length === 0 ? (
      <p className="text-sm text-gray-500">No exceptions defined</p>
    ) : (
      <div className="space-y-2">
        {formData.exceptions.map((exception, index) => (
          <div key={index} className="flex justify-between items-center p-2 border border-gray-200 rounded-md">
            <div>
              {exception.exceptionStartDate && exception.exceptionEndDate ? (
                <span className="text-sm">
                  {new Date(exception.exceptionStartDate).toLocaleDateString()} - {new Date(exception.exceptionEndDate).toLocaleDateString()}
                </span>
              ) : (
                <span className="text-sm">Custom rules</span>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleEditException(index)}
                className="text-blue-600 hover:text-blue-800"
              >
                <RiEditLine className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteException(index)}
                className="text-red-600 hover:text-red-800"
              >
                <RiDeleteBinLine className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
            {/* Modal Actions */}
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <RiSave3Line className="w-4 h-4 mr-2" />
                {editingRestriction ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ExceptionModal = ({ 
    exception, 
    setException, 
    onSave, 
    onClose,
    rooms,
    ratePolicies,
    daysOfWeekOptions
  }: {
    exception: RestrictionException | null;
    setException: React.Dispatch<React.SetStateAction<RestrictionException | null>>;
    onSave: () => void;
    onClose: () => void;
    rooms: Room[];
    ratePolicies: RatePolicy[];
    daysOfWeekOptions: { value: number; label: string }[];
  }) => {
    if (!exception) return null;
  
    const handleChange = (field: keyof RestrictionException, value: any) => {
      setException(prev => ({ ...prev!, [field]: value }));
    };
  
    const handleDaysChange = (day: number) => {
      setException(prev => ({
        ...prev!,
        exceptionDaysOfWeek: prev?.exceptionDaysOfWeek.includes(day)
          ? prev.exceptionDaysOfWeek.filter(d => d !== day)
          : [...(prev?.exceptionDaysOfWeek || []), day]
      }));
    };
  
    const handleRoomChange = (roomId: string) => {
      setException(prev => ({
        ...prev!,
        roomIds: prev?.roomIds.includes(roomId)
          ? prev.roomIds.filter(id => id !== roomId)
          : [...(prev?.roomIds || []), roomId]
      }));
    };
  
    const handleRatePolicyChange = (ratePolicyId: string) => {
      setException(prev => ({
        ...prev!,
        ratePolicyIds: prev?.ratePolicyIds.includes(ratePolicyId)
          ? prev.ratePolicyIds.filter(id => id !== ratePolicyId)
          : [...(prev?.ratePolicyIds || []), ratePolicyId]
      }));
    };
  
    return (
      <div className="fixed inset-0 bg-black/40 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Exception Rules</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <RiCloseLine className="w-6 h-6" />
            </button>
          </div>
  
          <div className="space-y-4">
            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={exception.exceptionStartDate || ''}
                  onChange={(e) => handleChange('exceptionStartDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={exception.exceptionEndDate || ''}
                  onChange={(e) => handleChange('exceptionEndDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
  
            {/* Days of Week */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Days of Week</label>
              <div className="flex flex-wrap gap-2">
                {daysOfWeekOptions.map((day) => (
                  <label key={day.value} className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={exception.exceptionDaysOfWeek.includes(day.value)}
                      onChange={() => handleDaysChange(day.value)}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">{day.label}</span>
                  </label>
                ))}
              </div>
            </div>
  
            {/* Override Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Min Length Override</label>
                <input
                  type="number"
                  value={exception.minLengthOverride || ''}
                  onChange={(e) => handleChange('minLengthOverride', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Length Override</label>
                <input
                  type="number"
                  value={exception.maxLengthOverride || ''}
                  onChange={(e) => handleChange('maxLengthOverride', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                />
              </div>
            </div>
  
            {/* Room Scope */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Room Scope</label>
              <select
                value={exception.roomScope || 'ALL_ROOMS'}
                onChange={(e) => handleChange('roomScope', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
              >
                <option value="ALL_ROOMS">All Rooms</option>
                <option value="SPECIFIC_ROOMS">Specific Rooms</option>
              </select>
  
              {exception.roomScope === 'SPECIFIC_ROOMS' && (
                <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-3">
                  {rooms.map((room) => (
                    <label key={room.id} className="flex items-center mb-2 last:mb-0">
                      <input
                        type="checkbox"
                        checked={exception.roomIds.includes(room.id)}
                        onChange={() => handleRoomChange(room.id)}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">{room.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
  
            {/* Rate Scope */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rate Scope</label>
              <select
                value={exception.rateScope || 'ALL_RATES'}
                onChange={(e) => handleChange('rateScope', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
              >
                <option value="ALL_RATES">All Rates</option>
                <option value="SPECIFIC_RATES">Specific Rates</option>
                <option value="BASE_RATE">Base Rate Only</option>
              </select>
  
              {exception.rateScope === 'SPECIFIC_RATES' && (
                <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-3">
                  {ratePolicies.map((ratePolicy) => (
                    <label key={ratePolicy.id} className="flex items-center mb-2 last:mb-0">
                      <input
                        type="checkbox"
                        checked={exception.ratePolicyIds.includes(ratePolicy.id)}
                        onChange={() => handleRatePolicyChange(ratePolicy.id)}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">{ratePolicy.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
  
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={exception.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Active</span>
            </div>
          </div>
  
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <RiSave3Line className="w-4 h-4 mr-2" />
              Save Exception
            </button>
          </div>
        </div>
      </div>
    );
  };