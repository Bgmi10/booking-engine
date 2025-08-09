import { useState, useEffect } from 'react';
import { BsArrowLeft, BsArrowRight } from 'react-icons/bs';
import { RiCloseLine } from 'react-icons/ri';
import { toast } from 'react-hot-toast';
import { baseUrl } from '../../../utils/constants';

// Import step components
import RoomMappingStep from './RoomMappingStep';
import RatePolicyStep from './RatePolicyStep';
import SyncConfigurationStep from './SyncConfigurationStep';
import BookingRestrictionsStep from './BookingRestrictionsStep';
import SummaryStep from './SummaryStep';
import type { SyncConfiguration } from '../../../types/types';

type Step = 'mapping' | 'policy' | 'sync' | 'restrictions' | 'summary';

interface SyncOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function SyncOnboardingModal({ 
  isOpen, 
  onClose, 
  onComplete 
}: SyncOnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('mapping');
  
  // Data state
  const [beds24Rooms, setBeds24Rooms] = useState<any[]>([]);
  const [roomMappings, setRoomMappings] = useState<any[]>([]);
  const [selectedRoomMappings, setSelectedRoomMappings] = useState<string[]>([]);
  const [selectedRatePolicy, setSelectedRatePolicy] = useState<string | null>(null);
  const [syncConfiguration, setSyncConfiguration] = useState<SyncConfiguration>({
    autoSync: true,
    syncFrequency: 'daily',
    markupPercent: 0,
    minStay: 1,
    maxStay: 30,
    syncStartDate: '',
    syncEndDate: '',
    applyToFutureDates: false
  });
  const [restrictionsConfiguration, setRestrictionsConfiguration] = useState({
    syncRestrictions: true,
    selectedRestrictions: [] as string[]
  });

  useEffect(() => {
    if (isOpen) {
      fetchRoomMappings();
      fetchBeds24Rooms();
    }
  }, [isOpen]);

  const fetchBeds24Rooms = async () => {
    try {
      const response = await fetch(`${baseUrl}/admin/beds24/rooms`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setBeds24Rooms(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch Beds24 rooms:', error);
    }
  };

  const fetchRoomMappings = async () => {
    try {
      const response = await fetch(`${baseUrl}/admin/beds24/room-mappings`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setRoomMappings(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch room mappings:', error);
    }
  };

  const handleCreateMapping = () => {
    // This will be called when user clicks create mapping in the step
    fetchRoomMappings(); // Refresh mappings after creation
  };

  if (!isOpen) return null;

  const stepTitles = {
    mapping: 'Select Room Mappings', 
    policy: 'Choose Rate Policy',
    sync: 'Configure Sync Settings',
    restrictions: 'Configure Booking Restrictions',
    summary: 'Review & Complete'
  };

  const getCurrentStepNumber = () => {
    const steps = ['mapping', 'policy', 'sync', 'restrictions', 'summary'];
    return steps.indexOf(currentStep) + 1;
  };

  const handleNext = () => {
    switch (currentStep) {
      case 'mapping':
        // Check if we have any room mappings at all
        if (roomMappings.length === 0) {
          toast.error('Please create at least one room mapping first');
          return;
        }
        if (selectedRoomMappings.length > 0) setCurrentStep('policy');
        else toast.error('Please select at least one room mapping');
        break;
      case 'policy':
        if (selectedRatePolicy) setCurrentStep('sync');
        else toast.error('Please select a rate policy');
        break;
      case 'sync':
        setCurrentStep('restrictions');
        break;
      case 'restrictions':
        setCurrentStep('summary');
        break;
      case 'summary':
        handleFinalSetup();
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'policy':
        setCurrentStep('mapping');
        break;
      case 'sync':
        setCurrentStep('policy');
        break;
      case 'restrictions':
        setCurrentStep('sync');
        break;
      case 'summary':
        setCurrentStep('restrictions');
        break;
    }
  };

  const handleFinalSetup = async () => {
    // Apply all configuration settings
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    onComplete();
  };


  const renderStep = () => {
    const commonProps = {
      // Add any common props needed by step components
    };

    switch (currentStep) {
      case 'mapping':
        return (
          <RoomMappingStep
            beds24Rooms={beds24Rooms}
            roomMappings={roomMappings}
            selectedMappings={selectedRoomMappings}
            onMappingsChange={setSelectedRoomMappings}
            onRefreshRooms={fetchBeds24Rooms}
            onCreateMapping={handleCreateMapping}
            onMappingCreated={fetchRoomMappings}
            {...commonProps}
          />
        );
      case 'policy':
        return (
          <RatePolicyStep
            selectedPolicy={selectedRatePolicy}
            onPolicyChange={setSelectedRatePolicy}
            {...commonProps}
          />
        );
      case 'sync':
        return (
          <SyncConfigurationStep
            configuration={syncConfiguration}
            onConfigurationChange={setSyncConfiguration}
            selectedMappings={selectedRoomMappings}
            {...commonProps}
          />
        );
      case 'restrictions':
        return (
          <BookingRestrictionsStep
            selectedMappings={selectedRoomMappings}
            syncConfiguration={syncConfiguration}
            onRestrictionsConfigChange={setRestrictionsConfiguration}
            {...commonProps}
          />
        );
      case 'summary':
        return (
          <SummaryStep
            connectionStatus={true}
            selectedMappings={selectedRoomMappings}
            selectedPolicy={selectedRatePolicy}
            configuration={syncConfiguration}
            roomMappings={roomMappings}
            restrictionsConfiguration={restrictionsConfiguration}
            {...commonProps}
          />
        );
      default:
        return null;
    }
  };

  const isNextDisabled = () => {
    switch (currentStep) {
      case 'mapping':
        return selectedRoomMappings.length === 0;
      case 'policy':
        return !selectedRatePolicy;
      case 'sync':
        return !syncConfiguration.syncStartDate || !syncConfiguration.syncEndDate;
      case 'restrictions':
        return false; // Always allow proceeding from restrictions step
      case 'summary':
        return false;
      default:
        return false;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white/90 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] md:h-[85vh] relative animate-fade-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200/80 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Rate Sync Setup</h2>
            <p className="text-sm text-gray-500">{stepTitles[currentStep]}</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-gray-600">Step</p>
              <p className="text-2xl font-bold text-blue-600">
                {getCurrentStepNumber()}/5
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RiCloseLine className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-4 py-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(getCurrentStepNumber() / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-grow p-6 overflow-y-auto">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50/80 border-t border-gray-200/80 flex justify-between items-center">
          <button
            onClick={handleBack}
            disabled={currentStep === 'mapping'}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <BsArrowLeft />
            Back
          </button>
          
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleNext}
            disabled={isNextDisabled()}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {currentStep === 'summary' ? 'Start Sync' : 'Next'}
            {currentStep !== 'summary' && <BsArrowRight />}
          </button>
        </div>
      </div>
    </div>
  );
}