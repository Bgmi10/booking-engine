import React, { useState, useEffect } from 'react';
import { 
  RiAddLine, 
  RiEditLine, 
  RiDeleteBinLine, 
  RiDownloadLine,
  RiSearchLine,
  RiRefreshLine,
  RiCloseLine,
  RiSave3Line,
  RiLoader4Line,
} from 'react-icons/ri';
import { baseUrl } from '../../../utils/constants';
import { useUsers } from '../../../hooks/useUsers';
import SearchSelectModal from '../../common/SearchSelectModal';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface LicensePlateEntry {
  id: string;
  plateNo: string;
  type: 'ALLOW_LIST' | 'BLOCK_LIST';
  ownerName: string;
  validStartTime: string;
  validEndTime: string;
  isActive: boolean;
  userId?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  bookingId?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface LicensePlateStats {
  total: number;
  active: number;
  inactive: number;
  allowList: number;
  blockList: number;
  expired: number;
  expiringSoon: number;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface CreateLicensePlateData {
  plateNo: string;
  type: 'ALLOW_LIST' | 'BLOCK_LIST';
  ownerName: string;
  validStartTime: Date;
  validEndTime: Date;
  userId?: string;
  notes?: string;
}

interface EditLicensePlateData extends CreateLicensePlateData {
  isActive?: boolean;
}

export default function LicensePlateManagement() {
  const [entries, setEntries] = useState<LicensePlateEntry[]>([]);
  const [stats, setStats] = useState<LicensePlateStats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Use the useUsers hook
  const { users } = useUsers();

  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'ALLOW_LIST' | 'BLOCK_LIST'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(25);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LicensePlateEntry | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [createNewUser, setCreateNewUser] = useState(false);
  const [editNewUser, setEditNewUser] = useState(false);
  const [showUserSelectModal, setShowUserSelectModal] = useState(false);
  const [showEditUserSelectModal, setShowEditUserSelectModal] = useState(false);

  // Form states
  const [createFormData, setCreateFormData] = useState<CreateLicensePlateData>({
    plateNo: '',
    type: 'ALLOW_LIST',
    ownerName: '',
    validStartTime: new Date(),
    validEndTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    userId: '',
    notes: ''
  });

  const [editFormData, setEditFormData] = useState<EditLicensePlateData>({
    plateNo: '',
    type: 'ALLOW_LIST',
    ownerName: '',
    validStartTime: new Date(),
    validEndTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    userId: '',
    notes: '',
    isActive: true
  });


  // Fetch license plate entries
  const fetchEntries = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      if (searchTerm) params.append('search', searchTerm);
      if (typeFilter !== 'ALL') params.append('type', typeFilter);
      if (statusFilter !== 'ALL') params.append('isActive', statusFilter === 'ACTIVE' ? 'true' : 'false');

      const response = await fetch(`${baseUrl}/admin/license-plates?${params}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setEntries(data.data.entries || []);
      setPagination(data.data.pagination || null);
    } catch (err: any) {
      console.error('Failed to fetch license plate entries:', err);
      setError(err.message || 'Failed to fetch license plate entries');
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await fetch(`${baseUrl}/admin/license-plates/stats`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStats(data.data || null);
    } catch (err: any) {
      console.error('Failed to fetch statistics:', err);
    }
  };

  // Create license plate entry
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${baseUrl}/admin/license-plates`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...createFormData,
          validStartTime: createFormData.validStartTime.toISOString(),
          validEndTime: createFormData.validEndTime.toISOString(),
          userId: createFormData.userId || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      setSuccess('License plate entry created successfully');
      setShowCreateModal(false);
      setCreateNewUser(false);
      setCreateFormData({
        plateNo: '',
        type: 'ALLOW_LIST',
        ownerName: '',
        validStartTime: new Date(),
        validEndTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        userId: '',
        notes: ''
      });
      await fetchEntries();
      await fetchStats();
    } catch (err: any) {
      console.error('Failed to create license plate entry:', err);
      setError(err.message || 'Failed to create license plate entry');
    } finally {
      setLoading(false);
    }
  };

  // Update license plate entry
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntry) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${baseUrl}/admin/license-plates/${selectedEntry.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...editFormData,
          validStartTime: editFormData.validStartTime.toISOString(),
          validEndTime: editFormData.validEndTime.toISOString(),
          userId: editFormData.userId || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      setSuccess('License plate entry updated successfully');
      setShowEditModal(false);
      setSelectedEntry(null);
      await fetchEntries();
      await fetchStats();
    } catch (err: any) {
      console.error('Failed to update license plate entry:', err);
      setError(err.message || 'Failed to update license plate entry');
    } finally {
      setLoading(false);
    }
  };

  // Delete license plate entry
  const handleDelete = async () => {
    if (!selectedEntry) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${baseUrl}/admin/license-plates/${selectedEntry.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      setSuccess('License plate entry deleted successfully');
      setShowDeleteModal(false);
      setSelectedEntry(null);
      await fetchEntries();
      await fetchStats();
    } catch (err: any) {
      console.error('Failed to delete license plate entry:', err);
      setError(err.message || 'Failed to delete license plate entry');
    } finally {
      setLoading(false);
    }
  };

  // Export CSV
  const handleExport = async () => {
    try {
      setLoading(true);
      
      let dataToExport = [];
      
      if (selectedEntries.size > 0) {
        // Export only selected entries
        dataToExport = entries.filter(entry => selectedEntries.has(entry.id));
      } else {
        // Export all entries with current filters
        const params = new URLSearchParams();
        if (typeFilter !== 'ALL') params.append('type', typeFilter);
        if (statusFilter !== 'ALL') params.append('isActive', statusFilter === 'ACTIVE' ? 'true' : 'false');

        const response = await fetch(`${baseUrl}/admin/license-plates/export?${params}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        dataToExport = data.data.entries || data.data.data || data.data || []; 
      }
      
      // Convert to CSV format
      const csvContent = convertToCSV(dataToExport);
      
      // Add UTF-8 BOM to help Excel recognize the encoding
      const BOM = "\uFEFF";
      
      // Download file
      const blob = new Blob([BOM + csvContent], { type: 'text/csv' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `license_plates_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccess(`License plate entries exported successfully${selectedEntries.size > 0 ? ` (${selectedEntries.size} selected)` : ''}`);
      setSelectedEntries(new Set());
    } catch (err: any) {
  
      setError(err.message || 'Failed to export license plate entries');
    } finally {
      setLoading(false);
    }
  };

  // Convert data to CSV format
  const convertToCSV = (data: any[]) => {
    if (!data.length) {
      return '';
    }
    
    // CSV headers
    const headers = ['Plate No.', 'Type', 'Owner Name', 'Valid Start Time(DD/MM/YYYY hh:mm)', 'Valid End Time(DD/MM/YYYY hh:mm)'];
    
    // Format dates to DD/MM/YYYY hh:mm format
    const formatDateForCSV = (dateString: string) => {
      if (!dateString) {
        return 'N/A';
      }
      
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          return 'Invalid Date';
        }
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const formatted = `${day}/${month}/${year} ${hours}:${minutes}`;
        return formatted;
      } catch (error) {
        return 'Error';
      }
    };
    
    // Helper function to escape CSV values
    const escapeCSV = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };
    
    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    
    // Add data rows
    data.forEach((row) => {
      const plateNo = row['Plate No.'] || row.plateNo || row.plate_no || row.plateNumber || '';
      const type = (row.Type === 'ALLOW_LIST' || row.type === 'ALLOW_LIST' || row.Type === 'Allow List') ? 'Allow List' : 'Block List';
      const ownerName = row['Owner Name'] || row.ownerName || row.owner_name || row.owner || '';
      const validStartTime = formatDateForCSV(row['Valid Start Time'] || row.validStartTime || row.valid_start_time || row.startTime);
      const validEndTime = formatDateForCSV(row['Valid End Time'] || row.validEndTime || row.valid_end_time || row.endTime);
      
      const csvRow = [
        escapeCSV(plateNo),
        escapeCSV(type),
        escapeCSV(ownerName),
        escapeCSV(validStartTime),
        escapeCSV(validEndTime)
      ].join(',');
      
      csvContent += csvRow + '\n';
    });
    
    return csvContent;
  };


  // Initialize data
  useEffect(() => {
    fetchEntries();
    fetchStats();
  }, [currentPage, searchTerm, typeFilter, statusFilter]);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check if entry is expired
  const isExpired = (endTime: string) => {
    return new Date(endTime) < new Date();
  };

  // Check if entry is expiring soon
  const isExpiringSoon = (endTime: string) => {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const endDate = new Date(endTime);
    return endDate > new Date() && endDate <= sevenDaysFromNow;
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">License Plate Management</h3>
          <p className="mt-1 text-sm text-gray-500">
            Manage ANPR license plate entries for gate access control
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 flex space-x-3">
          <button
            onClick={handleExport}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RiDownloadLine className="w-4 h-4 mr-2" />
            Export {selectedEntries.size > 0 ? `(${selectedEntries.size})` : 'CSV'}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RiAddLine className="w-4 h-4 mr-2" />
            Add Entry
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">T</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.total}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">A</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.active}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-600 rounded-md flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">+</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Allow</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.allowList}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">-</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Block</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.blockList}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gray-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">I</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Inactive</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.inactive}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-600 rounded-md flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">E</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Expired</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.expired}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">!</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Soon</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.expiringSoon}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search plate, owner, notes..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <RiSearchLine className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div>
            <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Type
            </label>
            <select
              id="type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Types</option>
              <option value="ALLOW_LIST">Allow List</option>
              <option value="BLOCK_LIST">Block List</option>
            </select>
          </div>

          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={(e) => {
                e.preventDefault();
                setSearchTerm('');
                setTypeFilter('ALL');
                setStatusFilter('ALL');
                setCurrentPage(1);
              }}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <RiRefreshLine className="w-4 h-4 mr-2" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
          {success}
        </div>
      )}

      {/* Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={entries.length > 0 && selectedEntries.size === entries.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEntries(new Set(entries.map(entry => entry.id)));
                      } else {
                        setSelectedEntries(new Set());
                      }
                    }}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  License Plate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valid Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center">
                    <RiLoader4Line className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">Loading entries...</p>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center">
                    <p className="text-sm text-gray-500">No license plate entries found</p>
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedEntries.has(entry.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedEntries);
                          if (e.target.checked) {
                            newSelected.add(entry.id);
                          } else {
                            newSelected.delete(entry.id);
                          }
                          setSelectedEntries(newSelected);
                        }}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{entry.plateNo}</div>
                      {entry.notes && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {entry.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        entry.type === 'ALLOW_LIST' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {entry.type === 'ALLOW_LIST' ? 'Allow' : 'Block'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{entry.ownerName}</div>
                      {entry.user && (
                        <div className="text-sm text-gray-500">{entry.user.name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{formatDate(entry.validStartTime)}</div>
                      <div className="text-gray-500">to {formatDate(entry.validEndTime)}</div>
                      {isExpired(entry.validEndTime) && (
                        <div className="text-red-500 text-xs">Expired</div>
                      )}
                      {isExpiringSoon(entry.validEndTime) && !isExpired(entry.validEndTime) && (
                        <div className="text-yellow-600 text-xs">Expires soon</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        entry.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {entry.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.user ? (
                        <div>
                          <div className="font-medium">{entry.user.name}</div>
                          <div className="text-xs text-gray-400">{entry.user.role}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => {
                          setSelectedEntry(entry);
                          setEditFormData({
                            plateNo: entry.plateNo,
                            type: entry.type,
                            ownerName: entry.ownerName,
                            validStartTime: new Date(entry.validStartTime),
                            validEndTime: new Date(entry.validEndTime),
                            userId: entry.userId || '',
                            notes: entry.notes || '',
                            isActive: entry.isActive
                          });
                          setEditNewUser(!entry.userId);
                          setShowEditModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <RiEditLine className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedEntry(entry);
                          setShowDeleteModal(true);
                        }}
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

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={!pagination.hasPrev}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                disabled={!pagination.hasNext}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing page <span className="font-medium">{pagination.currentPage}</span> of{' '}
                  <span className="font-medium">{pagination.totalPages}</span> ({pagination.totalCount} total entries)
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={!pagination.hasPrev}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                    disabled={!pagination.hasNext}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add License Plate Entry</h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateNewUser(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <RiCloseLine className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Plate Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={createFormData.plateNo}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, plateNo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ABC123"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type *
                  </label>
                  <select
                    required
                    value={createFormData.type}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ALLOW_LIST">Allow List</option>
                    <option value="BLOCK_LIST">Block List</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User Selection
                  </label>
                  <div className="flex items-center mb-2">
                    <input
                      type="radio"
                      id="existing-user"
                      name="user-selection"
                      checked={!createNewUser}
                      onChange={() => setCreateNewUser(false)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label htmlFor="existing-user" className="ml-2 text-sm text-gray-700">
                      Select Existing User
                    </label>
                    <input
                      type="radio"
                      id="new-user"
                      name="user-selection"
                      checked={createNewUser}
                      onChange={() => setCreateNewUser(true)}
                      className="ml-4 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label htmlFor="new-user" className="ml-2 text-sm text-gray-700">
                      Create New User
                    </label>
                  </div>
                  
                  {!createNewUser ? (
                    <div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          readOnly
                          value={createFormData.userId ? `${createFormData.ownerName} (${users.find(u => u.id === createFormData.userId)?.email || ''})` : ''}
                          placeholder="Click to select a user"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 cursor-pointer"
                          onClick={() => setShowUserSelectModal(true)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowUserSelectModal(true)}
                          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <RiSearchLine className="w-4 h-4" />
                        </button>
                        {createFormData.userId && (
                          <button
                            type="button"
                            onClick={() => setCreateFormData(prev => ({ ...prev, userId: '', ownerName: '' }))}
                            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <RiCloseLine className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <input
                      type="text"
                      required={createNewUser}
                      value={createFormData.ownerName}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, ownerName: e.target.value, userId: '' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter owner name"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid Start Time *
                  </label>
                  <DatePicker
                    selected={createFormData.validStartTime}
                    onChange={(date: Date | null) => {
                      if (date) {
                        setCreateFormData(prev => ({ ...prev, validStartTime: date }));
                      }
                    }}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Select start date"
                    minDate={new Date()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid End Time *
                  </label>
                  <DatePicker
                    selected={createFormData.validEndTime}
                    onChange={(date: Date | null) => {
                      if (date) {
                        setCreateFormData(prev => ({ ...prev, validEndTime: date }));
                      }
                    }}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Select end date"
                    minDate={createFormData.validStartTime}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={createFormData.notes}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Optional notes..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreateNewUser(false);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? (
                      <RiLoader4Line className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RiSave3Line className="w-4 h-4 mr-2" />
                    )}
                    {loading ? 'Creating...' : 'Create Entry'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedEntry && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Edit License Plate Entry</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <RiCloseLine className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Plate Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.plateNo}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, plateNo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ABC123"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type *
                  </label>
                  <select
                    required
                    value={editFormData.type}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ALLOW_LIST">Allow List</option>
                    <option value="BLOCK_LIST">Block List</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User Selection
                  </label>
                  <div className="flex items-center mb-2">
                    <input
                      type="radio"
                      id="edit-existing-user"
                      name="edit-user-selection"
                      checked={!editNewUser}
                      onChange={() => setEditNewUser(false)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label htmlFor="edit-existing-user" className="ml-2 text-sm text-gray-700">
                      Select Existing User
                    </label>
                    <input
                      type="radio"
                      id="edit-new-user"
                      name="edit-user-selection"
                      checked={editNewUser}
                      onChange={() => setEditNewUser(true)}
                      className="ml-4 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label htmlFor="edit-new-user" className="ml-2 text-sm text-gray-700">
                      Create New User
                    </label>
                  </div>
                  
                  {!editNewUser ? (
                    <div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          readOnly
                          value={editFormData.userId ? `${editFormData.ownerName} (${users.find(u => u.id === editFormData.userId)?.email || ''})` : ''}
                          placeholder="Click to select a user"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 cursor-pointer"
                          onClick={() => setShowEditUserSelectModal(true)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditUserSelectModal(true)}
                          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <RiSearchLine className="w-4 h-4" />
                        </button>
                        {editFormData.userId && (
                          <button
                            type="button"
                            onClick={() => setEditFormData(prev => ({ ...prev, userId: '', ownerName: '' }))}
                            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <RiCloseLine className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <input
                      type="text"
                      required={editNewUser}
                      value={editFormData.ownerName}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, ownerName: e.target.value, userId: '' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter owner name"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid Start Time *
                  </label>
                  <DatePicker
                    selected={editFormData.validStartTime}
                    onChange={(date: Date | null) => {
                      if (date) {
                        setEditFormData(prev => ({ ...prev, validStartTime: date }));
                      }
                    }}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Select start date"
                    minDate={new Date()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid End Time *
                  </label>
                  <DatePicker
                    selected={editFormData.validEndTime}
                    onChange={(date: Date | null) => {
                      if (date) {
                        setEditFormData(prev => ({ ...prev, validEndTime: date }));
                      }
                    }}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Select end date"
                    minDate={editFormData.validStartTime}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Optional notes..."
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={editFormData.isActive}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    Active
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleEdit(e);
                    }}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? (
                      <RiLoader4Line className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RiSave3Line className="w-4 h-4 mr-2" />
                    )}
                    {loading ? 'Updating...' : 'Update Entry'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedEntry && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Delete License Plate Entry</h3>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <RiCloseLine className="w-6 h-6" />
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Are you sure you want to delete the license plate entry for{' '}
                  <strong>{selectedEntry.plateNo}</strong> owned by{' '}
                  <strong>{selectedEntry.ownerName}</strong>?
                </p>
                <p className="text-sm text-red-600 mt-2">
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {loading ? (
                    <RiLoader4Line className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RiDeleteBinLine className="w-4 h-4 mr-2" />
                  )}
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Selection Modal for Create */}
      <SearchSelectModal
        isOpen={showUserSelectModal}
        onClose={() => setShowUserSelectModal(false)}
        onSelect={(user) => {
          setCreateFormData(prev => ({
            ...prev,
            userId: user.id,
            ownerName: user.name || ''
          }));
        }}
        items={users}
        columns={[
          {
            label: 'Name',
            render: (user) => user.name || 'N/A'
          },
          {
            label: 'Email',
            render: (user) => user.email
          },
          {
            label: 'Role',
            render: (user) => (
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {user.role}
              </span>
            )
          }
        ]}
        title="Select User"
        searchPlaceholder="Search by name or email..."
        getSearchString={(user) => `${user.name || ''} ${user.email}`}
      />

      {/* User Selection Modal for Edit */}
      <SearchSelectModal
        isOpen={showEditUserSelectModal}
        onClose={() => setShowEditUserSelectModal(false)}
        onSelect={(user) => {
          setEditFormData(prev => ({
            ...prev,
            userId: user.id,
            ownerName: user.name || ''
          }));
        }}
        items={users}
        columns={[
          {
            label: 'Name',
            render: (user) => user.name || 'N/A'
          },
          {
            label: 'Email',
            render: (user) => user.email
          },
          {
            label: 'Role',
            render: (user) => (
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {user.role}
              </span>
            )
          }
        ]}
        title="Select User"
        searchPlaceholder="Search by name or email..."
        getSearchString={(user) => `${user.name || ''} ${user.email}`}
      />
    </div>
  );
}