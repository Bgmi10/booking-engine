import { Star, Plus, Minus, ShoppingBag, Euro } from 'lucide-react';
import type { Enhancement } from '../../types/types';

interface EnhancementsSectionProps {
    isMainGuest: boolean;
    totalGuests: number;
    enhancementState: {
        enhancements: Enhancement[];
        selectedEnhancements: Enhancement[];
        addEnhancement: (enhancement: Enhancement) => void;
        removeEnhancement: (enhancementId: string) => void;
        clearSelectedEnhancements: () => void;
        calculateTotalPrice: (guestCount?: number) => number;
    };
}

export const EnhancementsSection = ({ 
    isMainGuest, 
    totalGuests,
    enhancementState
}: EnhancementsSectionProps) => {
    
    const {
        enhancements,
        selectedEnhancements,
        addEnhancement,
        removeEnhancement,
        clearSelectedEnhancements,
        calculateTotalPrice
    } = enhancementState;

    // Only show to main guests and if there are enhancements available
    if (!isMainGuest || enhancements.length === 0) return null;

    const handleAddEnhancement = (enhancement: Enhancement) => {
        addEnhancement(enhancement);
    };

    const handleRemoveEnhancement = (enhancementId: string) => {
        removeEnhancement(enhancementId);
    };

    const getEnhancementPrice = (enhancement: Enhancement) => {
        let price = enhancement.price;
        if (enhancement.pricingType === 'PER_GUEST') {
            price *= totalGuests;
        }
        return price;
    };

    const getPricingTypeLabel = (pricingType: Enhancement['pricingType']) => {
        switch (pricingType) {
            case 'PER_GUEST':
                return `per guest`;
            case 'PER_BOOKING':
                return 'per booking';
            case 'PER_DAY':
                return 'per day';
            default:
                return '';
        }
    };

    const totalSelectedPrice = calculateTotalPrice(totalGuests);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Star className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Enhance Your Stay</h3>
                            <p className="text-sm text-gray-600">Add special services and experiences</p>
                        </div>
                    </div>
                    {selectedEnhancements.length > 0 && (
                        <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">
                                €{totalSelectedPrice.toFixed(2)}
                            </div>
                            <p className="text-sm text-gray-600">{selectedEnhancements.length} Selected</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Available Enhancements */}
                <div className="space-y-4">
                    {enhancements.map((enhancement) => {
                        const isSelected = selectedEnhancements.some(e => e.id === enhancement.id);
                        const enhancementPrice = getEnhancementPrice(enhancement);
                        
                        return (
                            <div 
                                key={enhancement.id} 
                                className={`border rounded-lg overflow-hidden transition-all duration-200 ${
                                    isSelected 
                                        ? 'border-purple-300 bg-purple-50' 
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="p-4">
                                    <div className="flex items-start gap-4">
                                        {/* Enhancement Image */}
                                        {enhancement.image && (
                                            <div className="flex-shrink-0">
                                                <img 
                                                    src={enhancement.image} 
                                                    alt={enhancement.name}
                                                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover"
                                                />
                                            </div>
                                        )}
                                        
                                        {/* Enhancement Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-gray-900 mb-1">
                                                        {enhancement.name}
                                                    </h4>
                                                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                                        {enhancement.description}
                                                    </p>
                                                    
                                                    {/* Pricing */}
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-lg font-bold text-gray-900">
                                                            €{enhancement.price.toFixed(2)}
                                                        </span>
                                                        <span className="text-sm text-gray-600">
                                                            {getPricingTypeLabel(enhancement.pricingType)}
                                                        </span>
                                                        {enhancement.pricingType === 'PER_GUEST' && totalGuests > 1 && (
                                                            <span className="text-sm font-medium text-purple-600">
                                                                (€{enhancementPrice.toFixed(2)} for {totalGuests} guests)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {/* Action Button */}
                                                <div className="flex-shrink-0">
                                                    {isSelected ? (
                                                        <button
                                                            onClick={() => handleRemoveEnhancement(enhancement.id)}
                                                            className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                                                        >
                                                            <Minus className="h-4 w-4" />
                                                            Remove
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleAddEnhancement(enhancement)}
                                                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                            Add
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                        </div>
                                    </div>

                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Selected Enhancements Summary */}
                {selectedEnhancements.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <ShoppingBag className="h-5 w-5 text-purple-600" />
                                    <h4 className="font-semibold text-purple-900">Selected Enhancements</h4>
                                </div>
                                <button
                                    onClick={clearSelectedEnhancements}
                                    className="text-sm text-purple-600 hover:text-purple-700 underline"
                                >
                                    Clear all
                                </button>
                            </div>
                            
                            <div className="space-y-2 mb-4">
                                {selectedEnhancements.map((enhancement) => {
                                    const enhancementPrice = getEnhancementPrice(enhancement);
                                    return (
                                        <div key={enhancement.id} className="flex justify-between items-center text-sm">
                                            <div>
                                                <span className="font-medium text-purple-900">{enhancement.name}</span>
                                                <span className="text-purple-700 ml-2">({getPricingTypeLabel(enhancement.pricingType)})</span>
                                            </div>
                                            <span className="font-semibold text-purple-900">
                                                €{enhancementPrice.toFixed(2)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            
                            <div className="flex items-center justify-between pt-3 border-t border-purple-300">
                                <div className="flex items-center gap-2">
                                    <Euro className="h-4 w-4 text-purple-600" />
                                    <span className="font-semibold text-purple-900">Total Enhancement Cost</span>
                                </div>
                                <div className="text-lg font-bold text-purple-900">
                                    €{totalSelectedPrice.toFixed(2)}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};