import React, { useState, useEffect } from 'react';
import type { Product } from '../../../types/types';
import { useImageUpload } from '../../../hooks/useImageUpload';
import { RiImageAddLine, RiCloseLine } from 'react-icons/ri';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Omit<Product, 'id'> | Product) => void;
  productToEdit?: Product | null;
  loading: boolean;
}

const weddingCategories = [
    'Food & Beverage',
    'Decorations & Floral',
    'Entertainment',
    'Venue Rental',
    'Accommodation',
    'Planning Services',
    'Photography & Video',
    'Equipment Rental',
    'Other'
];

const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, onSave, productToEdit, loading }) => {
  const [formData, setFormData] = useState<any>({
    name: '',
    description: '',
    price: 0,
    category: 'WEDDING',
    type: 'WEDDING',
    isActive: true,
    pricingModel: 'FIXED',
    image: '',
    sampleMenu: {
      name: '',
      description: '',
      price: 0,
      image: ''
    }
  });

  const productUploader = useImageUpload();
  const menuUploader = useImageUpload();

  useEffect(() => {
    if (productToEdit) {
      // Make sure we have a sampleMenu object even if productToEdit doesn't have one
      const sampleMenu = productToEdit.sampleMenu || {
        name: '',
        description: '',
        price: 0,
        image: ''
      };
      
      setFormData({
        ...productToEdit,
        sampleMenu
      });
      
      if (productToEdit.image) {
        productUploader.setInitialImages([productToEdit.image]);
      } else {
        productUploader.resetImages();
      }
      
      if (sampleMenu.image) {
        menuUploader.setInitialImages([sampleMenu.image]);
      } else {
        menuUploader.resetImages();
      }
    } else {
      setFormData({
        name: '',
        description: '',
        price: 0,
        category: 'WEDDING',
        type: 'WEDDING',
        isActive: true,
        pricingModel: 'FIXED',
        image: '',
        sampleMenu: {
          name: '',
          description: '',
          price: 0,
          image: ''
        }
      });
      productUploader.resetImages();
      menuUploader.resetImages();
    }
  }, [productToEdit, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (name.startsWith('sampleMenu.')) {
        const field = name.split('.')[1];
        setFormData((prev: any) => ({
            ...prev,
            sampleMenu: { ...prev.sampleMenu, [field]: value }
        }));
        return;
    }

    if (type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked;
        setFormData((prev: any) => ({ ...prev, [name]: checked }));
    } else if (name === 'price') {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            setFormData((prev: any)=> ({ ...prev, [name]: numValue }));
        }
    } else {
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave = {
        ...formData,
        price: parseFloat(formData.price.toString()) || 0,
        image: productUploader.images.length > 0 ? productUploader.images[0] : '',
        sampleMenu: {
            ...formData.sampleMenu,
            price: parseFloat(formData.sampleMenu.price.toString()) || 0,
            image: menuUploader.images.length > 0 ? menuUploader.images[0] : ''
        }
    };
    onSave(productToEdit ? { ...dataToSave, id: productToEdit.id } : dataToSave);
  };

  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        style={{ backdropFilter: 'blur(4px)' }}
        onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg relative flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold">{productToEdit ? 'Edit Product' : 'Add New Product'}</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Image Uploader */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
                <div 
                    onDragEnter={productUploader.handleDragEnter}
                    onDragLeave={productUploader.handleDragLeave}
                    onDragOver={productUploader.handleDragOver}
                    onDrop={productUploader.handleDrop}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                        ${productUploader.isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
                >
                    <input
                        type="file"
                        className="hidden"
                        onChange={(e) => productUploader.uploadImages(Array.from(e.target.files || []))}
                        accept="image/*"
                        id="imageUpload"
                    />
                    {productUploader.images.length > 0 ? (
                        <div className="relative inline-block">
                            <img src={productUploader.images[0]} alt="Preview" className="h-32 w-32 object-cover rounded-lg" />
                            <button type="button" onClick={() => productUploader.removeImage(0)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><RiCloseLine/></button>
                        </div>
                    ) : (
                        <label htmlFor="imageUpload" className="cursor-pointer flex flex-col items-center space-y-2">
                            <RiImageAddLine className="h-10 w-10 text-gray-400" />
                            <span className="text-sm text-gray-600">Drag & drop or click to upload</span>
                        </label>
                    )}
                </div>
                {productUploader.uploadingImage && <p className="text-sm text-gray-500 mt-2">Uploading...</p>}
            </div>

            {/* Form Fields */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
              <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
              <textarea name="description" id="description" value={formData.description} onChange={handleInputChange} rows={3} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"></textarea>
            </div>
            
            {/* Sample Menu Section */}
            <div className="space-y-4 rounded-lg border border-gray-200 p-4">
                <h4 className="text-md font-semibold text-gray-800">Sample Menu Details</h4>
                <div>
                    <label htmlFor="sampleMenu.name" className="block text-sm font-medium text-gray-700">Menu Name</label>
                    <input type="text" name="sampleMenu.name" id="sampleMenu.name" value={formData.sampleMenu.name} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
                <div>
                    <label htmlFor="sampleMenu.description" className="block text-sm font-medium text-gray-700">Menu Description</label>
                    <textarea name="sampleMenu.description" id="sampleMenu.description" value={formData.sampleMenu.description} onChange={handleInputChange} rows={3} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"></textarea>
                </div>
                 <div>
                    <label htmlFor="sampleMenu.price" className="block text-sm font-medium text-gray-700">Menu Price (€)</label>
                    <input type="number" name="sampleMenu.price" id="sampleMenu.price" value={formData.sampleMenu.price} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Menu Image</label>
                     <div 
                        onDragEnter={menuUploader.handleDragEnter}
                        onDragLeave={menuUploader.handleDragLeave}
                        onDragOver={menuUploader.handleDragOver}
                        onDrop={menuUploader.handleDrop}
                        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                            ${menuUploader.isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
                    >
                        <input
                            type="file"
                            className="hidden"
                            onChange={(e) => menuUploader.uploadImages(Array.from(e.target.files || []))}
                            accept="image/*"
                            id="menuImageUpload"
                        />
                        {menuUploader.images.length > 0 ? (
                            <div className="relative inline-block">
                                <img src={menuUploader.images[0]} alt="Menu Preview" className="h-32 w-32 object-cover rounded-lg" />
                                <button type="button" onClick={() => menuUploader.removeImage(0)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><RiCloseLine/></button>
                            </div>
                        ) : (
                            <label htmlFor="menuImageUpload" className="cursor-pointer flex flex-col items-center space-y-2">
                                <RiImageAddLine className="h-10 w-10 text-gray-400" />
                                <span className="text-sm text-gray-600">Drag & drop or click to upload</span>
                            </label>
                        )}
                    </div>
                    {menuUploader.uploadingImage && <p className="text-sm text-gray-500 mt-2">Uploading...</p>}
                </div>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
              <select name="category" id="category" value={formData.category} onChange={handleInputChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                <option value="" disabled>Select a category</option>
                {weddingCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price (€)</label>
                <input type="number" name="price" id="price" value={formData.price} onChange={handleInputChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="pricingModel" className="block text-sm font-medium text-gray-700">Pricing Model</label>
                <select name="pricingModel" id="pricingModel" value={formData.pricingModel} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                  <option value="FIXED">Fixed</option>
                  <option value="PER_PERSON">Per Person</option>
                </select>
              </div>
            </div>
            <div className="flex items-center">
                <input type="checkbox" name="isActive" id="isActive" checked={formData.isActive} onChange={handleInputChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">Product is Active</label>
            </div>
          </div>
        </form>

        <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-4">
            <button type="button" onClick={onClose} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">Cancel</button>
            <button type="submit" onClick={handleSubmit} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-300">
                {loading ? 'Saving...' : 'Save Product'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ProductFormModal; 