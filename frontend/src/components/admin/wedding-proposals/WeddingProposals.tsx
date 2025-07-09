import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { baseUrl } from '../../../utils/constants';
import type { Product, WeddingProposal } from '../../../types/types';
import { RiAddLine, RiPencilLine, RiDeleteBinLine, RiImageLine, RiEyeLine } from 'react-icons/ri';
import ProductFormModal from './ProductFormModal';
import ProposalFormModal from './ProposalFormModal';
import ProposalDetails from './ProposalDetails';
import ItineraryItemsModal from './ItineraryItemsModal';

const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: (e: React.MouseEvent) => void }) => (
  <button
    onClick={onChange}
    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-green-500' : 'bg-gray-300'}`}
  >
    <span
      className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${checked ? 'translate-x-6' : 'translate-x-1'}`}
    />
  </button>
);

// Custom Modal Component using pure Tailwind CSS
const Modal = ({ 
  isOpen, 
  onClose, 
  children, 
  title 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  children: React.ReactNode; 
  title: string;
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" onClick={onClose}></div>
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

const WeddingProposals: React.FC = () => {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [proposals, setProposals] = useState<WeddingProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [proposalToEdit, setProposalToEdit] = useState<WeddingProposal | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<WeddingProposal | null>(null);
  const [isDetailsView, setIsDetailsView] = useState(false);
  const [selectedDay, setSelectedDay] = useState<any>(null);
  const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);

  const tabs = [
    { id: 'products', name: 'Products & Services' },
    { id: 'proposals', name: 'Wedding Proposals' },
  ];

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}/admin/products/all?type=WEDDING`, {
        credentials: 'include',
      });
      const result = await response.json();
      if (response.ok) {
        setProducts(result.data || []);
      } else {
        throw new Error(result.message || 'Failed to fetch products');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const fetchProposals = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}/admin/wedding-proposals`, {
        credentials: 'include',
      });
      const result = await response.json();
      if (response.ok) {
        setProposals(result.data || []);
      } else {
        throw new Error(result.message || 'Failed to fetch proposals');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch proposals');
    } finally {
      setLoading(false);
    }
  };

  const fetchProposalDetails = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}/admin/wedding-proposals/${id}`, {
        credentials: 'include',
      });
      const result = await response.json();
      if (response.ok) {
        setSelectedProposal(result.data);
        setIsDetailsView(true);
      } else {
        throw new Error(result.message || 'Failed to fetch proposal details');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch proposal details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'products') {
      fetchProducts();
    } else if (activeTab === 'proposals') {
      fetchProposals();
    }
  }, [activeTab]);
  
  const handleToggleStatus = async (productToUpdate: Product, e: React.MouseEvent) => {
    e.stopPropagation(); 
    const originalProducts = [...products];
    const newStatus = !productToUpdate.isActive;

    setProducts(prevProducts =>
      prevProducts.map(p =>
        p.id === productToUpdate.id ? { ...p, isActive: newStatus } : p
      )
    );

    try {
      const response = await fetch(`${baseUrl}/admin/products/${productToUpdate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: newStatus }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update status');
      }
      
      toast.success(`'${productToUpdate.name}' status updated.`);
    } catch (error: any) {
      toast.error(error.message || `Failed to update '${productToUpdate.name}'.`);
      setProducts(originalProducts);
    }
  };

  const handleDeleteProduct = async (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`${baseUrl}/admin/products/${productId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete product.');
      }
      toast.success('Product deleted successfully!');
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProposal = async (proposalId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this proposal?')) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`${baseUrl}/admin/wedding-proposals/${proposalId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete proposal.');
      }
      toast.success('Proposal deleted successfully!');
      fetchProposals();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenProductModal = (product: Product | null = null) => {
    setProductToEdit(product);
    setIsProductModalOpen(true);
  };

  const handleOpenProposalModal = (proposal: WeddingProposal | null = null) => {
    setProposalToEdit(proposal);
    setIsProposalModalOpen(true);
  };

  const handleSaveProduct = async (productData: Omit<Product, 'id'> | Product) => {
    setActionLoading(true);
    const isEditing = 'id' in productData;
    const url = isEditing ? `${baseUrl}/admin/products/${productData.id}` : `${baseUrl}/admin/products`;
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(productData),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || `Failed to ${isEditing ? 'update' : 'create'} product.`);
      }

      toast.success(`Product ${isEditing ? 'updated' : 'created'} successfully!`);
      fetchProducts(); // Refresh the list
      setIsProductModalOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveProposal = async (proposalData: any) => {
    setActionLoading(true);
    const isEditing = proposalToEdit !== null;
    const url = isEditing 
      ? `${baseUrl}/admin/wedding-proposals/${proposalToEdit.id}` 
      : `${baseUrl}/admin/wedding-proposals`;
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(proposalData),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || `Failed to ${isEditing ? 'update' : 'create'} proposal.`);
      }

      toast.success(`Proposal ${isEditing ? 'updated' : 'created'} successfully!`);
      fetchProposals(); // Refresh the list
      setIsProposalModalOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setActionLoading(true);
    try {
      const response = await fetch(`${baseUrl}/admin/wedding-proposals/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to update status');
      }

      toast.success(`Proposal status updated to ${newStatus}`);
      
      // Refresh the proposal details if we're viewing it
      if (selectedProposal && selectedProposal.id === id) {
        fetchProposalDetails(id);
      } else {
        fetchProposals(); // Otherwise refresh the list
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditDay = (day: any) => {
    setSelectedDay(day);
    setIsItemsModalOpen(true);
  };

  const handleSaveItems = async (dayId: string, items: any[]) => {
    setActionLoading(true);
    try {
      const response = await fetch(`${baseUrl}/admin/wedding-proposals/${selectedProposal?.id}/days/${dayId}/items`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ items }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update itinerary items');
      }

      // Update the selected proposal with the updated day
      if (selectedProposal) {
        const updatedProposal = {
          ...selectedProposal,
          itineraryDays: selectedProposal.itineraryDays.map(day =>
            day.id === dayId ? { ...day, items: result.data.items } : day
          ),
        };
        setSelectedProposal(updatedProposal);
      }

      setIsItemsModalOpen(false);
      toast.success('Itinerary items updated successfully! The customer has been notified of these changes.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update itinerary items');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBackToList = () => {
    setIsDetailsView(false);
    setSelectedProposal(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    }).format(date);
  };

  return (
    <div className="p-2 sm:p-4 md:p-6 bg-gray-50 min-h-full">
      {!isDetailsView ? (
        <>
          <div className="w-full flex justify-center mb-6">
            <div className="bg-gray-200 p-1 rounded-lg flex space-x-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors duration-300 ${
                    activeTab === tab.id
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'bg-transparent text-gray-500 hover:text-gray-600'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>
          </div>
          
          {activeTab === 'products' && (
            <div className="bg-white rounded-xl shadow-sm">
              <div className="flex justify-between items-center p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Products & Services</h2>
                <button
                  onClick={() => handleOpenProductModal()}
                  className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
                  aria-label="Add New Product"
                >
                  <RiAddLine size={20} />
                </button>
              </div>

              {loading ? (
                <div className="p-6 text-center text-gray-500">Loading...</div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {products.length > 0 ? products.map((product) => (
                    <li key={product.id} className="p-4 flex items-center justify-between group">
                      <div className="flex items-center space-x-4 flex-grow cursor-pointer" onClick={() => handleOpenProductModal(product)}>
                        {product.image ? (
                            <img src={product.image} alt={product.name} className="h-12 w-12 object-cover rounded-lg" />
                        ) : (
                            <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                <RiImageLine className="h-6 w-6 text-gray-400" />
                            </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-800">{product.name}</p>
                          <p className="text-sm text-gray-500">{product.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                         <p className="text-sm text-gray-700">€{product.price.toFixed(2)}</p>
                         <ToggleSwitch checked={product.isActive} onChange={(e) => handleToggleStatus(product, e)} />
                         <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); handleOpenProductModal(product); }} className="text-gray-500 hover:text-blue-600"><RiPencilLine size={18}/></button>
                            <button onClick={(e) => handleDeleteProduct(product.id, e)} className="text-gray-500 hover:text-red-600"><RiDeleteBinLine size={18}/></button>
                         </div>
                      </div>
                    </li>
                  )) : (
                    <li className="p-6 text-center text-gray-500">No products found. Add one to get started.</li>
                  )}
                </ul>
              )}
            </div>
          )}

          {activeTab === 'proposals' && (
            <div className="bg-white rounded-xl shadow-sm">
              <div className="flex justify-between items-center p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Wedding Proposals</h2>
                <button
                  onClick={() => handleOpenProposalModal()}
                  className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
                  aria-label="Create New Proposal"
                >
                  <RiAddLine size={20} />
                </button>
              </div>

              {loading ? (
                <div className="p-6 text-center text-gray-500">Loading...</div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {proposals.length > 0 ? proposals.map((proposal) => (
                    <li key={proposal.id} className="p-4 flex items-center justify-between group">
                      <div className="flex items-center space-x-4 flex-grow cursor-pointer" onClick={() => fetchProposalDetails(proposal.id)}>
                        <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold">
                          {proposal.customer.guestFirstName.charAt(0)}{proposal.customer.guestLastName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{proposal.name}</p>
                          <div className="flex space-x-3 text-sm text-gray-500">
                            <span>Wedding Date: {formatDate(proposal.weddingDate)}</span>
                            <span>•</span>
                            <span>Guests: {proposal.mainGuestCount}</span>
                            <span>•</span>
                            <span className="capitalize">{proposal.status.toLowerCase()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            fetchProposalDetails(proposal.id); 
                          }} 
                          className="text-gray-500 hover:text-blue-600"
                        >
                          <RiEyeLine size={18}/>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenProposalModal(proposal); }} 
                          className="text-gray-500 hover:text-blue-600"
                        >
                          <RiPencilLine size={18}/>
                        </button>
                        <button 
                          onClick={(e) => handleDeleteProposal(proposal.id, e)} 
                          className="text-gray-500 hover:text-red-600"
                        >
                          <RiDeleteBinLine size={18}/>
                        </button>
                      </div>
                    </li>
                  )) : (
                    <li className="p-6 text-center text-gray-500">No proposals found. Create one to get started.</li>
                  )}
                </ul>
              )}
            </div>
          )}
        </>
      ) : (
        // Proposal Details View
        selectedProposal && (
          <div>
            {/* Header Section */}
            <div className="mb-6">
              <button
                onClick={handleBackToList}
                className="text-blue-500 hover:underline flex items-center mb-2"
              >
                Back to All Proposals
              </button>
              
              <ProposalDetails 
                proposal={selectedProposal}
                onEditDay={handleEditDay}
                onUpdateStatus={handleUpdateStatus}
                loading={actionLoading}
                onProposalUpdate={(updatedProposal) => setSelectedProposal(updatedProposal)}
              />
            </div>
          </div>
        )
      )}

      {/* Modals */}
      {isProductModalOpen && (
        <Modal 
          isOpen={isProductModalOpen} 
          onClose={() => setIsProductModalOpen(false)}
          title={productToEdit ? 'Edit Product' : 'Add New Product'}
        >
          <ProductFormModal
            isOpen={isProductModalOpen}
            onClose={() => setIsProductModalOpen(false)}
            onSave={handleSaveProduct}
            productToEdit={productToEdit}
            loading={actionLoading}
          />
        </Modal>
      )}

      {isProposalModalOpen && (
        <Modal 
          isOpen={isProposalModalOpen} 
          onClose={() => setIsProposalModalOpen(false)}
          title={proposalToEdit ? 'Edit Proposal' : 'Create New Wedding Proposal'}
        >
          <ProposalFormModal
            isOpen={isProposalModalOpen}
            onClose={() => setIsProposalModalOpen(false)}
            onSave={handleSaveProposal}
            proposalToEdit={proposalToEdit}
            loading={actionLoading}
          />
        </Modal>
      )}

      {isItemsModalOpen && (
        <Modal 
          isOpen={isItemsModalOpen} 
          onClose={() => setIsItemsModalOpen(false)}
          title={selectedDay ? `Day ${selectedDay.dayNumber}: ${formatDate(selectedDay.date)}` : 'Itinerary Items'}
        >
          <ItineraryItemsModal
            isOpen={isItemsModalOpen}
            onClose={() => setIsItemsModalOpen(false)}
            onSave={handleSaveItems}
            day={selectedDay}
            proposalId={selectedProposal?.id || ''}
            loading={actionLoading}
          />
        </Modal>
      )}
    </div>
  );
};

export default WeddingProposals; 