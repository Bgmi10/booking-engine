import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { format, addMonths, addYears, isBefore } from 'date-fns';
import { HiOutlineTrash, HiOutlinePlus } from 'react-icons/hi';
import { baseUrl } from '../../../utils/constants';
import type { PaymentPlan } from '../../../types/types';

type Props = {
  proposalId: string;
  weddingDate: string;
  totalAmount?: number;
  proposalName: string;
};

const PaymentPlanEditor: React.FC<Props> = ({ 
  proposalId, 
  weddingDate, 
  totalAmount = 0,
  proposalName
}) => {
  const [loading, setLoading] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>({
    proposalId,
    totalAmount,
    currency: 'eur',
    stages: [],
    id: '',
    createdAt: '',
    updatedAt: ''
  });
  const [error, setError] = useState<string | null>(null);

  // Get formatted wedding date
  const getFormattedDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'yyyy-MM-dd');
    } catch (error) {
      console.error('Error formatting date:', dateStr, error);
      return dateStr;
    }
  };

  // Load existing payment plan if available
  useEffect(() => {
    const fetchPaymentPlan = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`${baseUrl}/payment-plans/proposals/${proposalId}/payment-plan`, {
            method: "GET",
            credentials: "include"
        });
        
        // First check if the response is OK
        if (!response.ok) {
          console.error('API response not OK:', response.status);
          createDefaultPaymentPlan();
          return;
        }
        
        const data = await response.json();
        const plan = data.data;
        // Check if stages exist and are an array
        if (!plan.stages || !Array.isArray(plan.stages)) {
          plan.stages = [];
        }
        
        const formattedStages = plan.stages.map((stage: any) => ({
          ...stage,
          dueDate: getFormattedDate(stage.dueDate)
        }));
        
        setPaymentPlan({
          id: plan.id || '',
          proposalId: plan.proposalId || proposalId,
          totalAmount: plan.totalAmount || totalAmount,
          currency: plan.currency || 'eur',
          createdAt: plan.createdAt || '',
          updatedAt: plan.updatedAt || '',
          stages: formattedStages
        });
        
      } catch (error) {
        console.error('Error fetching payment plan:', error);
        // If error occurs, create a default one
        createDefaultPaymentPlan();
        setError('Failed to load payment plan');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPaymentPlan();
  }, [proposalId]);

  // Create a default payment plan based on the wedding date
  const createDefaultPaymentPlan = () => {
    try {
      console.log('Creating default payment plan with wedding date:', weddingDate);
      const weddingDateObj = new Date(weddingDate);
      
      const today = new Date();
      const oneYearBefore = addYears(weddingDateObj, -1);
      const threeMonthsBefore = addMonths(weddingDateObj, -3);
      
      // Adjust dates if they're in the past
      const accommodationDueDate = isBefore(oneYearBefore, today) ? today : oneYearBefore;
      const finalDueDate = isBefore(threeMonthsBefore, today) ? today : threeMonthsBefore;
      
      const depositAmount = Math.round(totalAmount * 0.25 * 100) / 100;
      const accommodationAmount = Math.round(totalAmount * 0.50 * 100) / 100;
      const finalAmount = Math.round(totalAmount * 0.25 * 100) / 100;
      
      const defaultPlan = {
        proposalId,
        totalAmount,
        currency: 'eur',
        id: '',
        createdAt: '',
        updatedAt: '',
        stages: [
          {
            description: 'Initial Deposit',
            amount: depositAmount,
            dueDate: getFormattedDate(today.toISOString())
          },
          {
            description: 'Accommodation Payment',
            amount: accommodationAmount,
            dueDate: getFormattedDate(accommodationDueDate.toISOString())
          },
          {
            description: 'Final Payment',
            amount: finalAmount,
            dueDate: getFormattedDate(finalDueDate.toISOString())
          }
        ]
      };
      setPaymentPlan(defaultPlan);
    } catch (error) {
      console.error('Error creating default payment plan:', error);
      // Create a simple default plan if dates can't be parsed
      const simplePlan = {
        proposalId,
        totalAmount,
        currency: 'eur',
        id: '',
        createdAt: '',
        updatedAt: '',
        stages: [
          {
            description: 'Initial Deposit',
            amount: Math.round(totalAmount * 0.25 * 100) / 100,
            dueDate: getFormattedDate(new Date().toISOString())
          }
        ]
      };
      setPaymentPlan(simplePlan);
    }
  };

  // Add a new payment stage
  const addStage = () => {
    const newStage = {
      description: '',
      amount: 0,
      dueDate: getFormattedDate(new Date().toISOString())
    };
    
    console.log('Adding new stage:', newStage);
    
    setPaymentPlan(prevPlan => ({
      ...prevPlan,
      stages: [...prevPlan.stages, newStage]
    }));
  };

  // Remove a payment stage
  const removeStage = async (index: number) => {
    const stage = paymentPlan.stages[index];
    if (stage.id) {
        try {
            setLoading(true);
            const response = await fetch(`${baseUrl}/payment-plans/payment-stages/${stage.id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) {
                const data = await response.json();
                toast.error(data.message || 'Failed to delete payment stage');
                return;
            }

            toast.success('Payment stage deleted successfully');
        } catch (error) {
            console.error('Error deleting payment stage:', error);
            toast.error('Failed to delete payment stage');
            return;
        } finally {
            setLoading(false);
        }
    }
    
    // Update local state
    setPaymentPlan(prevPlan => {
        const newStages = [...prevPlan.stages];
        newStages.splice(index, 1);
        return {
            ...prevPlan,
            stages: newStages
        };
    });
  };

  // Update a stage's field
  const updateStage = (index: number, field: string, value: string | number) => {
    
    setPaymentPlan(prevPlan => {
      const newStages = [...prevPlan.stages];
      newStages[index] = {
        ...newStages[index],
        [field]: value
      };
      
      return {
        ...prevPlan,
        stages: newStages
      };
    });
  };

  // Calculate the sum of all stage amounts
  const getTotalStagesAmount = () => {
    return paymentPlan.stages.reduce((sum, stage) => sum + Number(stage.amount), 0);
  };

  // Calculate the difference between the total amount and the sum of stages
  const getAmountDifference = () => {
    const stagesTotal = getTotalStagesAmount();
    return Math.round(((totalAmount || 0) - stagesTotal) * 100) / 100;
  };

  // Refresh payment plan data from the server
  const refreshPaymentPlan = async () => {
    try {
      console.log('Refreshing payment plan data');
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `${baseUrl}/payment-plans/proposals/${proposalId}/payment-plan`,
        {
          method: "GET",
          credentials: "include"
        }
      );
      
      // First check if the response is OK
      if (!response.ok) {
        // If the plan is not found (404), it's not an error to be displayed,
        // it just means one hasn't been created yet. Silently fail.
        if (response.status !== 404) {
        console.error('API refresh response not OK:', response.status);
        setError('Failed to refresh payment plan');
        }
        return false;
      }
      
      // Parse the JSON response
      const data = await response.json();
      
      // We have valid data, now use it
      const plan = data.data;
      
      // Check if stages exist and are an array
      if (!plan || !plan.stages || !Array.isArray(plan.stages)) {
        console.warn('No valid stages array in refresh response, using empty array');
        plan.stages = [];
      }
      
      // Format dates for form fields
      const formattedStages = plan.stages.map((stage: any) => ({
        ...stage,
        dueDate: getFormattedDate(stage.dueDate)
      }));

      setPaymentPlan({
        id: plan.id || '',
        proposalId: plan.proposalId || proposalId,
        totalAmount: plan.totalAmount || totalAmount,
        currency: plan.currency || 'eur',
        createdAt: plan.createdAt || '',
        updatedAt: plan.updatedAt || '',
        stages: formattedStages
      });
      
      setError(null);
      return true;
      
    } catch (error) {
      console.error('Error refreshing payment plan:', error);
      setError('Error refreshing payment plan');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Save the payment plan
  const savePaymentPlan = async () => {
    // Validate inputs
    if (paymentPlan.stages.length === 0) {
      toast.error('Please add at least one payment stage');
      return;
    }
    
    // Check if all required fields are filled
    for (const stage of paymentPlan.stages) {
      if (!stage.description || !stage.amount || !stage.dueDate) {
        toast.error('Please fill in all fields for each payment stage');
        return;
      }
    }
    
    // Check if total amount matches
    const amountDifference = getAmountDifference();
    if (Math.abs(amountDifference) > 0.01) {
      toast.error(`The sum of all payment stages (${getTotalStagesAmount()}) must equal the total amount (${totalAmount})`);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `${baseUrl}/payment-plans/proposals/${proposalId}/payment-plan`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: "include",
          body: JSON.stringify(paymentPlan)
        }
      );
      
      // First check if the response is OK
      if (!response.ok) {
        console.error('API save response not OK:', response.status);
        toast.error('Failed to save payment plan');
        setError('Failed to save payment plan');
        return;
      }
      
      // Parse the JSON response
      const data = await response.json();
      
      // Check if we have a successful response with data
      if (!data || data.success !== true || !data.data) {
        console.error('Invalid API save response structure:', data);
        toast.error(data?.message || 'Failed to save payment plan');
        setError(data?.message || 'Failed to save payment plan');
        return;
      }
      
      // Success! Show toast message
      toast.success('Payment plan saved successfully');
      
      // We have valid data, now use it
      const savedPlan = data.data;
      // Check if stages exist and are an array
      if (!savedPlan.stages || !Array.isArray(savedPlan.stages)) {
        console.warn('No valid stages array in save response, using empty array');
        savedPlan.stages = [];
      }
      
      // Format dates for form fields
      const formattedStages = savedPlan.stages.map((stage: any) => ({
        ...stage,
        dueDate: getFormattedDate(stage.dueDate)
      }));
      
      setPaymentPlan({
        id: savedPlan.id || '',
        proposalId: savedPlan.proposalId || proposalId,
        totalAmount: savedPlan.totalAmount || totalAmount,
        currency: savedPlan.currency || 'eur',
        createdAt: savedPlan.createdAt || '',
        updatedAt: savedPlan.updatedAt || '',
        stages: formattedStages
      });

    } catch (error) {
      console.error('Error saving payment plan:', error);
      toast.error('An error occurred while saving the payment plan');
      setError('An error occurred while saving the payment plan');
    } finally {
      setLoading(false);
    }
  };

  // Create a payment link for a stage
  const createPaymentLink = async (stageId: string) => {
    try {
      setLoading(true);
      setError(null);
            
      const response = await fetch(
        `${baseUrl}/payment-plans/payment-stages/${stageId}/pay`,
        {
          method: 'POST',
          credentials: "include",
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      // First check if the response is OK
      if (!response.ok) {
        console.error('API payment link response not OK:', response.status);
        toast.error('Failed to create payment link');
        setError('Failed to create payment link');
        return;
      }
      
      const data = await response.json();
      
      if (!data || data.success !== true || !data.data) {
        console.error('Invalid API payment link response structure:', data);
        toast.error(data?.message || 'Failed to create payment link');
        setError(data?.message || 'Failed to create payment link');
        return;
      }
      
      // Success! Show toast message
      toast.success('Payment link created successfully');
      
      // Open the payment URL in a new tab
      window.open(data.data.paymentUrl, '_blank');
      
      // Refresh the payment plan to get updated status
      await refreshPaymentPlan();
      
    } catch (error) {
      console.error('Error creating payment link:', error);
      toast.error('An error occurred while creating the payment link');
      setError('An error occurred while creating the payment link');
    } finally {
      setLoading(false);
    }
  };

  // Get the status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Payment Plan for {proposalName}</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Total Amount:</span>
          <span className="font-semibold">{totalAmount.toFixed(2)} EUR</span>
        </div>
        
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Sum of Stages:</span>
          <span className={`font-semibold ${Math.abs(getAmountDifference()) > 0.01 ? 'text-red-600' : ''}`}>
            {getTotalStagesAmount().toFixed(2)} EUR
          </span>
        </div>
        
        {Math.abs(getAmountDifference()) > 0.01 && (
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Difference:</span>
            <span className="font-semibold text-red-600">
              {getAmountDifference().toFixed(2)} EUR
            </span>
          </div>
        )}
      </div>
      
      <div className="mb-4">
        <h3 className="text-lg font-medium mb-2">Payment Stages</h3>
        
        {paymentPlan.stages.map((stage, index) => (
          <div key={stage.id || index} className="border rounded-md p-4 mb-3 bg-gray-50">
            {stage.status && (
              <div className="flex justify-end mb-2">
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(stage.status)}`}>
                  {stage.status}
                </span>
              </div>
            )}
            
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={stage.description}
                  onChange={(e) => updateStage(index, 'description', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  disabled={stage.status === 'PAID' || stage.status === 'PROCESSING'}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (EUR)</label>
                <input
                  type="number"
                  step="0.01"
                  value={stage.amount}
                  onChange={(e) => updateStage(index, 'amount', parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  disabled={stage.status === 'PAID' || stage.status === 'PROCESSING'}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={stage.dueDate}
                  onChange={(e) => updateStage(index, 'dueDate', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  disabled={stage.status === 'PAID' || stage.status === 'PROCESSING'}
                />
              </div>
            </div>
            
            <div className="flex justify-between mt-3 ">
              <button
                type="button"
                onClick={() => removeStage(index)}
                className="text-red-600 hover:text-red-800 flex items-center"
                disabled={stage.status === 'PAID' || stage.status === 'PROCESSING'}
              >
                <HiOutlineTrash className="mr-1" />
                Remove
              </button>
              
              {stage.id && stage.status !== 'PAID' && (
                <button
                  type="button"
                  onClick={() => createPaymentLink(stage.id!)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
                  disabled={loading || stage.status === 'PROCESSING'}
                >
                  {stage.status === 'PROCESSING' ? 'Processing...' : 'Create Link'}
                </button>
              )}
            </div>
          </div>
        ))}
        
        <button
          type="button"
          onClick={addStage}
          className="flex items-center text-blue-600 hover:text-blue-800 mt-2"
        >
          <HiOutlinePlus className="mr-1" />
          Add Payment Stage
        </button>
      </div>
      
      <div className="flex justify-between mt-6 pt-4 border-t">
        <button
          type="button"
          onClick={refreshPaymentPlan}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Plan'}
        </button>
        
        <button
          type="button"
          onClick={savePaymentPlan}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Plan'}
        </button>
      </div>
    </div>
  );
};

export default PaymentPlanEditor; 