import React, { useState } from 'react';

interface Column<T> {
  label: string;
  render: (item: T) => React.ReactNode;
}

interface SearchSelectModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: T) => void;
  items: T[];
  columns: Column<T>[];
  title: string;
  searchPlaceholder?: string;
  getSearchString: (item: T) => string;
}

function SearchSelectModal<T extends { id: string }>({
  isOpen,
  onClose,
  onSelect,
  items,
  columns,
  title,
  searchPlaceholder = 'Search...',
  getSearchString,
}: SearchSelectModalProps<T>) {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = items.filter(item =>
    getSearchString(item).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <span className="sr-only">Close</span>
          &#10005;
        </button>
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-4 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map(col => (
                  <th key={col.label} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{col.label}</th>
                ))}
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr><td colSpan={columns.length + 1} className="text-center py-8">No results found.</td></tr>
              ) : (
                filtered.map(item => (
                  <tr key={item.id}>
                    {columns.map(col => (
                      <td key={col.label} className="px-4 py-2 whitespace-nowrap">{col.render(item)}</td>
                    ))}
                    <td className="px-4 py-2 whitespace-nowrap">
                      <button
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        onClick={() => { onSelect(item); onClose(); }}
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SearchSelectModal; 