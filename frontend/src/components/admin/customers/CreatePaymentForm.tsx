import { useState, useEffect } from 'react';
import type { Customer as CustomerType } from "../../../hooks/useCustomers";
import { ArrowLeft, X } from 'lucide-react';
import CurrencySelectionModal, { currencies } from './CurrencySelectionModal';
import PaymentMethodSelection from './PaymentMethodSelection';
import ManualTransactionForm from './ManualTransactionForm';
import HostedInvoiceForm from './HostedInvoiceForm';
import { baseUrl } from '../../../utils/constants';

interface CreatePaymentFormProps {
    customer: CustomerType;
    onBack: () => void;
    onClose: () => void;
    paymentIntentId?: string;
}

const NumpadButton = ({ value, letters, onClick }: { value: string; letters?: string; onClick: (value: string) => void }) => (
    <button
        onClick={() => onClick(value)}
        className="bg-gray-200/60 hover:bg-gray-300/60 text-gray-800 font-bold py-4 rounded-lg text-2xl transition-colors aspect-video focus:ring-2 focus:ring-blue-500 focus:outline-none"
        tabIndex={0}
        aria-label={`Number ${value}${letters ? ` with letters ${letters}` : ''}`}
    >
        {value}
        {letters && <div className="text-xs font-normal tracking-widest">{letters}</div>}
    </button>
);

const BackspaceIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
        <line x1="18" y1="9" x2="12" y2="15" />
        <line x1="12" y1="9" x2="18" y2="15" />
    </svg>
);


const BackspaceButton = ({ onClick }: { onClick: () => void }) => (
    <button
        onClick={onClick}
        className="bg-gray-200/60 hover:bg-gray-300/60 text-gray-800 font-bold py-4 rounded-lg flex justify-center items-center aspect-video focus:ring-2 focus:ring-blue-500 focus:outline-none"
        tabIndex={0}
        aria-label="Backspace"
    >
        <BackspaceIcon />
    </button>
);

export default function CreatePaymentForm({ customer, onBack, onClose, paymentIntentId }: CreatePaymentFormProps) {
    const [view, setView] = useState('payment_method'); // Start with payment method selection
    const [amount, setAmount] = useState('0');
    const [description, setDescription] = useState('');
    const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
    const [currency, setCurrency] = useState(currencies[0]);
    const [isProcessing, setIsProcessing] = useState(false);
    //@ts-ignore
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');

    const handleNumpadClick = (value: string) => {
        let newAmount = amount;
        if (value === '.') {
            if (newAmount.includes('.')) return;
            newAmount = newAmount + '.';
        } else if (newAmount === '0') {
            newAmount = value;
        } else {
            const parts = newAmount.split('.');
            if (parts.length > 1 && parts[1].length >= 2) {
                return;
            }
            newAmount = newAmount + value;
        }
        setAmount(newAmount);
    };

    const handleSelectCurrency = (currency: typeof currencies[0]) => {
        setCurrency(currency);
        setIsCurrencyModalOpen(false);  
    };

    const handleNextFromAmount = () => {
        handleAmountConfirmed();
    };

    const handlePaymentMethodSelected = async (methodId: string) => {
        setSelectedPaymentMethod(methodId);
        
        // For all payment methods, move to amount entry first
        setView('amount_entry');
    };
    
    const handleAmountConfirmed = async () => {
        // Process the payment based on the selected method
        const methodId = selectedPaymentMethod;
        
        if (methodId === 'cash') {
            // Handle cash payment directly here
            setIsProcessing(true);
            try {
                const response = await fetch(baseUrl + `/admin/charges/cash`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        customerId: customer.id,
                        paymentIntentId: paymentIntentId,
                        amount: parseFloat(amount),
                        description: description || 'Cash payment',
                        currency: currency.code,
                    }),
                });

                const responseData = await response.json();

                if (response.ok && responseData.success) {
                    onClose(); // Close the modal since payment is done
                } else {
                    alert(responseData.message || 'Failed to process cash payment.');
                }
            } catch (error) {
                console.error('Error processing cash payment:', error);
                alert('An unexpected error occurred while processing the cash payment.');
            } finally {
                setIsProcessing(false);
            }
            return;
        }
        
        if (methodId === 'manual_transaction_id') {
            setView('manual_transaction');
        } else if (methodId === 'hosted_invoice') {
            setView('hosted_invoice');
        } else if (methodId === 'qr_code') {
            setIsProcessing(true);
            try {
                const response = await fetch(baseUrl + `/admin/charges/create-qr-session`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        customerId: customer.id,
                        paymentIntentId: paymentIntentId,
                        amount: amount,
                        description: description,
                        currency: currency.code,
                    }),
                });
    
                const responseData = await response.json();
    
                if (!response.ok) {
                    alert(responseData.message || 'Failed to create QR session.');
                    return;
                }
                
                window.location.href = `/qr/${responseData.data.chargeId}`;
    
            } catch (error) {
                console.error('Error creating QR session:', error);
                alert('An unexpected error occurred while creating the QR session.');
            } finally {
                setIsProcessing(false);
            }
        } else if (methodId === 'manual_charge') {
            setView('card_entry');
        }
    };

    const handleBackspace = () => {
        if (amount.length > 1) {
            setAmount(amount.slice(0, -1));
        } else {
            setAmount('0');
        }
    };

    const handleBack = () => {
        if (view === 'amount_entry') {
            setView('payment_method');
        } else if (view === 'manual_transaction') {
            setView('amount_entry');
        } else if (view === 'hosted_invoice') {
            setView('amount_entry');
        } else if (view === 'qr_code') {
            setView('amount_entry');
        } else if (view === 'card_entry') {
            setView('amount_entry');
        } else if (view === 'payment_method') {
            onBack();
        } else {
            onBack();
        }
    };

    const displayAmount = amount === '0' ? '0' : amount;

    // Handle keyboard input for amount entry
    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            // Only handle keyboard input when on amount entry view
            if (view !== 'amount_entry') return;
            
            // Prevent keyboard input when description field is focused
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                return;
            }

            const key = event.key;
            
            // Handle number keys (0-9)
            if (key >= '0' && key <= '9') {
                event.preventDefault();
                handleNumpadClick(key);
            }
            // Handle decimal point
            else if (key === '.' || key === ',') {
                event.preventDefault();
                handleNumpadClick('.');
            }
            // Handle backspace/delete
            else if (key === 'Backspace' || key === 'Delete') {
                event.preventDefault();
                handleBackspace();
            }
            // Handle Enter key to proceed to next
            else if (key === 'Enter') {
                event.preventDefault();
                if (parseFloat(amount) > 0) {
                    handleNextFromAmount();
                }
            }
            // Handle Escape key to close
            else if (key === 'Escape') {
                event.preventDefault();
                onClose();
            }
        };

        // Add event listener
        window.addEventListener('keydown', handleKeyPress);

        // Cleanup
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [view, amount]); // Re-add listener when view or amount changes

    const renderView = () => {
        switch (view) {
            case 'manual_transaction':
                return (
                    <ManualTransactionForm
                        customer={customer}
                        paymentIntentId={paymentIntentId}
                        onBack={handleBack}
                        onClose={onClose}
                        isProcessing={isProcessing}
                    />
                );
            case 'hosted_invoice':
                return (
                    <HostedInvoiceForm
                        customer={customer}
                        paymentIntentId={paymentIntentId}
                        amount={amount}
                        currency={currency}
                        onBack={handleBack}
                        description={description}
                        onClose={onClose}
                        isProcessing={isProcessing}
                    />
                );
            case 'payment_method':
                return (
                    <PaymentMethodSelection
                        amount={displayAmount}
                        currency={currency}
                        onNext={handlePaymentMethodSelected}
                        isProcessing={isProcessing}
                        customerId={customer.id}
                        description={description}
                        hideAmountDisplay={true}
                    />
                );
            case 'qr_code':
                 // This view is now handled directly by the logic in handlePaymentMethodSelected
                 // We can show a processing indicator or redirect message if needed.
                 // For now, let's keep the user on the payment method selection screen while processing.
                return (
                    <PaymentMethodSelection
                        amount={displayAmount}
                        currency={currency}
                        onNext={handlePaymentMethodSelected}
                        isProcessing={isProcessing}
                        customerId={customer.id}
                        description={description}
                    />
                );
            case 'card_entry':
                return (
                    <PaymentMethodSelection
                        amount={displayAmount}
                        currency={currency}
                        onNext={handlePaymentMethodSelected}
                        isProcessing={isProcessing}
                        customerId={customer.id}
                        description={description}
                    />
                );
            case 'amount_entry':
            default:
                return (
                    <>
                        <div className="flex-grow p-6 flex flex-col justify-between overflow-y-auto">
                            <div className="flex-shrink-0">
                                <div className="text-center mb-6">
                                    <span className="text-6xl font-light text-gray-800 flex items-center justify-center">
                                         <span className="text-4xl mr-1">{currency.symbol}</span>
                                        <span className="font-medium tracking-tight">{displayAmount}</span>
                                        <span className="inline-block w-1 h-10 bg-blue-500 ml-1 animate-pulse rounded-full"></span>
                                    </span>
                                </div>

                                <div className="mb-6">
                                    <label className="text-sm text-gray-600 flex justify-between">Description <span className="text-gray-400">Optional</span></label>
                                    <input
                                        type="text"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Add description"
                                        className="w-full mt-1 p-2 bg-transparent border-b-2 border-gray-200 focus:border-blue-500 outline-none transition-colors"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm text-gray-600">Customer</label>
                                        <div className="mt-1 font-semibold text-gray-800 text-lg">
                                            {customer.guestFirstName} {customer.guestLastName}
                                        </div>
                                    </div>
                                    {selectedPaymentMethod && (
                                        <div>
                                            <label className="text-sm text-gray-600">Payment Method</label>
                                            <div className="mt-1 font-semibold text-gray-800">
                                                {selectedPaymentMethod === 'cash' && 'Cash'}
                                                {selectedPaymentMethod === 'qr_code' && 'QR Code'}
                                                {selectedPaymentMethod === 'hosted_invoice' && 'Hosted Invoice'}
                                                {selectedPaymentMethod === 'manual_transaction_id' && 'Manual Transaction'}
                                                {selectedPaymentMethod === 'manual_charge' && 'Manual Card Charge'}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="w-full mt-6">
                                <button
                                    onClick={handleNextFromAmount}
                                    className="cursor-pointer w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 text-lg"
                                    disabled={parseFloat(amount) <= 0 || isProcessing}>
                                    {isProcessing ? 'Processing...' : selectedPaymentMethod === 'cash' ? 'Collect Cash' : 'Continue'}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-0.5 p-0.5 bg-gray-300/40 flex-shrink-0">
                            <NumpadButton value="1" letters=" " onClick={handleNumpadClick} />
                            <NumpadButton value="2" letters="ABC" onClick={handleNumpadClick} />
                            <NumpadButton value="3" letters="DEF" onClick={handleNumpadClick} />
                            <NumpadButton value="4" letters="GHI" onClick={handleNumpadClick} />
                            <NumpadButton value="5" letters="JKL" onClick={handleNumpadClick} />
                            <NumpadButton value="6" letters="MNO" onClick={handleNumpadClick} />
                            <NumpadButton value="7" letters="PQRS" onClick={handleNumpadClick} />
                            <NumpadButton value="8" letters="TUV" onClick={handleNumpadClick} />
                            <NumpadButton value="9" letters="WXYZ" onClick={handleNumpadClick} />
                            <NumpadButton value="." onClick={handleNumpadClick} />
                            <NumpadButton value="0" onClick={handleNumpadClick} />
                            <BackspaceButton onClick={handleBackspace} />
                        </div>
                    </>
                );
        }
    };
    
    return (
        <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full m-auto flex flex-col h-[95vh] max-h-[720px] relative overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
                <button onClick={handleBack} className="text-gray-500 hover:text-gray-800 p-2 cursor-pointer">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-lg font-semibold text-gray-800">
                    Create a payment
                </h2>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-2 cursor-pointer">
                    <X size={20} />
                </button>
            </div>
            
            {renderView()}

            <CurrencySelectionModal
                isOpen={isCurrencyModalOpen}
                onClose={() => setIsCurrencyModalOpen(false)}
                onSelectCurrency={handleSelectCurrency}
                selectedCurrency={currency.code}
            />
        </div>
    );
} 