import { useState, useMemo } from "react";
import type { OrderItem as OrderItemType, AvailabilityRule } from "../../../types/types";
import { FaRegClock } from "react-icons/fa";
import { BsCheckCircleFill, BsCircle, BsPlus, BsDash } from 'react-icons/bs';
import { ArrowLeft } from 'lucide-react';
import { useOrderCategories } from "../../../hooks/useOrderCategories";

// Helper to check time-based rules
const isWithinTime = (rule: AvailabilityRule | null | undefined): boolean => {
  if (!rule || !rule.isActive) return true; 

  const now = new Date();
  const dayOfWeek = now.getDay(); // Sunday: 0, Monday: 1, ...
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const isDayMatch = rule.daysOfWeek.includes(dayOfWeek);
  if (!isDayMatch) return false;

  const isTimeMatch = currentTime >= rule.startTime && currentTime <= rule.endTime;
  return isTimeMatch;
};


interface ProductSelectionStepProps {
  cart: any[];
  setCart: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function ProductSelectionStep({ cart, setCart }: ProductSelectionStepProps) {
  const [internalView, setInternalView] = useState<'categories' | 'products'>('categories');
  const { categories: allCategories, loading, error } = useOrderCategories();
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryId: string, isAvailable: boolean) => {
    if (!isAvailable) return;
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const productsToShow = useMemo(() => {
    // 1. Get all unique products from all selected categories
    const allProducts = new Map<string, OrderItemType>();
    allCategories
      .filter(c => selectedCategories.has(c.id))
      .forEach(category => {
        category.orderItems.forEach(item => {
          if (!allProducts.has(item.id)) {
            allProducts.set(item.id, item);
          }
        });
      });

    // 2. Map products back to the categories they belong to
    return allCategories
      .filter(c => selectedCategories.has(c.id))
      .map(category => {
        const isCatCurrentlyAvailable = (category.isAvailable ?? false) && isWithinTime(category.availabilityRule);
        const itemsForThisCategory = category.orderItems.filter(item => {
          // Only include the item if it's still in our unique map (i.e., it hasn't been "taken" by an earlier category)
          if (allProducts.has(item.id)) {
            allProducts.delete(item.id); // Mark as "taken"
            return true;
          }
          return false;
        });

        return {
          ...category,
          isAvailable: isCatCurrentlyAvailable,
          orderItems: itemsForThisCategory.sort((a, b) => a.name.localeCompare(b.name))
        };
      });
  }, [allCategories, selectedCategories]);

  const getCartItemQuantity = (itemId: string) => cart.find(i => i.id === itemId)?.quantity || 0;

  const updateCartQuantity = (item: OrderItemType, categoryIsAvailable: boolean, change: 1 | -1, categoryLocationNames?: string[]) => {
    if (!item.isAvailable || !categoryIsAvailable) return;

    setCart(prevCart => {
        const existingItemIndex = prevCart.findIndex(cartItem => cartItem.id === item.id);
        const newCart = [...prevCart];

        if (existingItemIndex > -1) {
            const existingItem = newCart[existingItemIndex];
            const newQuantity = existingItem.quantity + change;

            if (newQuantity <= 0) {
                newCart.splice(existingItemIndex, 1);
            } else {
                newCart[existingItemIndex] = { ...existingItem, quantity: newQuantity };
            }
        } else if (change === 1) {
            newCart.push({ ...item, quantity: 1, locationNames: categoryLocationNames || [] });
        }

        return newCart;
    });
  };

  const renderCategories = () => (
    <div className="flex flex-col h-full">
        <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-center text-gray-800">Select Categories</h3>
        </div>
        <div className="flex-grow overflow-y-auto">
            {loading && <div className="p-4 text-center">Loading categories...</div>}
            {error && <div className="p-4 text-center text-red-500">Error: {error.message}</div>}
            {!loading && !error && allCategories.map(category => {
                const isCatAvailable = (category.isAvailable ?? false) && isWithinTime(category.availabilityRule);
                const isSelected = selectedCategories.has(category.id);
                return (
                    <div
                        key={category.id}
                        onClick={() => toggleCategory(category.id, isCatAvailable)}
                        className={`flex items-center justify-between p-4 border-b border-gray-100 transition-colors ${
                          isCatAvailable ? 'cursor-pointer hover:bg-gray-50' : 'bg-gray-100 opacity-60 cursor-not-allowed'
                        }`}
                    >
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800">{category.name}</span>
                          {!isCatAvailable && <span className="text-xs text-red-500">Not Available</span>}
                        </div>
                        {isSelected ? <BsCheckCircleFill className="text-blue-600" size={20} /> : <BsCircle className="text-gray-300" size={20} />}
                    </div>
                );
            })}
        </div>
        <div className="p-4 bg-gray-50/80 border-t border-gray-200/80">
            <button
                onClick={() => setInternalView('products')}
                disabled={selectedCategories.size === 0}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
                {`View Items (${selectedCategories.size} ${selectedCategories.size === 1 ? 'Category' : 'Categories'})`}
            </button>
        </div>
    </div>
  );

  const renderProducts = () => (
    <div className="flex flex-col h-full">
        <div className="p-4 border-b border-gray-200 flex items-center">
            <button onClick={() => setInternalView('categories')} className="text-gray-500 hover:text-gray-800 p-2 -ml-2 mr-2 cursor-pointer">
                <ArrowLeft size={20} />
            </button>
            <h3 className="text-lg font-semibold text-gray-800">Select Products</h3>
        </div>
        <div className="flex-grow overflow-y-auto">
            {productsToShow.map(category => (
                <div key={category.id}>
                    <div className="bg-gray-100 p-2 px-4 sticky top-0 flex justify-between items-center">
                        <h4 className="font-bold text-gray-700">{category.name}</h4>
                        {!category.isAvailable && (
                          <div className="flex items-center gap-1 text-xs text-orange-600">
                            <FaRegClock />
                            <span>Unavailable</span>
                          </div>
                        )}
                    </div>
                    {category.orderItems.map(item => {
                        const quantity = getCartItemQuantity(item.id);
                        const isItemFullyAvailable = item.isAvailable && category.isAvailable;
                        return (
                            <div key={item.id} className={`flex items-center p-3 border-b border-gray-100 relative`}>
                                <div className="relative w-16 h-16 mr-4">
                                  <img src={item.imageUrl} alt={item.name} className={`w-16 h-16 rounded-lg object-cover ${!isItemFullyAvailable ? 'grayscale' : ''}`} />
                                  {!isItemFullyAvailable && (
                                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg">
                                          <span className="text-white font-bold text-sm">N/A</span>
                                      </div>
                                  )}
                                </div>
                                <div className="flex-grow">
                                    <p className={`font-semibold ${!isItemFullyAvailable ? 'text-gray-400' : 'text-gray-800'}`}>{item.name}</p>
                                    <p className="text-sm text-gray-500">€{item.price.toFixed(2)}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button 
                                    //@ts-ignore
                                        onClick={() => updateCartQuantity(item, category.isAvailable ?? false, -1, category.locations?.map(l => l.name))} 
                                        disabled={!isItemFullyAvailable || quantity === 0}
                                        className="text-red-500 disabled:opacity-20"
                                    >
                                        <BsDash size={24} />
                                    </button>
                                    <span className="font-bold text-lg w-6 text-center">{quantity}</span>
                                    <button 
                                    //@ts-ignore
                                        onClick={() => updateCartQuantity(item, category.isAvailable ?? false, 1, category.locations?.map(l => l.name))} 
                                        disabled={!isItemFullyAvailable}
                                        className="text-green-500 disabled:opacity-20"
                                    >
                                        <BsPlus size={24} />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ))}
        </div>
    </div>
  )

  return internalView === 'categories' ? renderCategories() : renderProducts();
}