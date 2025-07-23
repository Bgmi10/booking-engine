import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { baseUrl } from '../../utils/constants';

interface Room {
    id: string;
    name: string;
    description: string;
    capacity: number;
    price: number;
}

const CustomerVerify: React.FC<{ 
    onVerificationSuccess: () => void;
    guestType: 'booked' | 'temp';
}> = ({ onVerificationSuccess, guestType }) => {
    const [surname, setSurname] = useState('');
    const [randomGuestName, setRandomGuestName] = useState('');
    const [roomName, setRoomName] = useState('');
    const [allRooms, setAllRooms] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAllRooms = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${baseUrl}/customers/all-rooms`);
                const data = await response.json();
                if (response.ok) {
                    setAllRooms(data.data);
                } else {
                    throw new Error(data.message || 'Failed to load rooms.');
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        // Generate random guest name for temp users
        if (guestType === 'temp') {
            const location = new URLSearchParams(window.location.search).get("location") || "Venue";
            const randomName = `Guest-${Math.random().toString(36).substring(2, 8)}-${location}`;
            setRandomGuestName(randomName);
        } else {
            fetchAllRooms();
        }
    }, [guestType]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (guestType === 'booked') {
            if (!surname) {
                setError('Please provide your surname.');
                return;
            }
            if (!roomName) {
                setError('Please select a room.');
                return;
            }
        }

        setIsLoading(true);
        try {
            const requestBody = { 
                surname: guestType === 'booked' ? surname : randomGuestName, 
                isGuest: guestType === 'temp'
            };

            if (guestType === 'booked') {
                //@ts-ignore
                requestBody.roomName = roomName;
            }

            const response = await fetch(`${baseUrl}/customers/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
                credentials: 'include',
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Verification successful!');
                onVerificationSuccess();
            } else {
                throw new Error(data.message || 'Verification failed.');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900">
                    {guestType === 'booked' ? 'Verify Your Booking' : 'Guest Information'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                    {guestType === 'booked' 
                        ? 'Please provide your surname and select your room to verify your booking'
                        : 'We\'ll create a temporary guest profile for your order'
                    }
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {guestType === 'booked' ? (
                    <>
                        <div>
                            <label htmlFor="surname" className="block text-sm font-medium text-gray-700">
                                Surname (Last Name)
                            </label>
                            <input
                                id="surname"
                                type="text"
                                value={surname}
                                onChange={(e) => setSurname(e.target.value)}
                                placeholder="Enter your surname"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black"
                                disabled={isLoading}
                                required
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="roomName" className="block text-sm font-medium text-gray-700">
                                Select Your Room
                            </label>
                            <select
                                id="roomName"
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black"
                                disabled={isLoading || allRooms.length === 0}
                                required
                            >
                                <option value="">{isLoading ? 'Loading rooms...' : 'Select your room'}</option>
                                {allRooms.map((room) => (
                                    <option key={room.id} value={room.name}>
                                        {room.name} - {room.description}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                We'll verify that you have an active booking for this room
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-4">
                        <p className="text-gray-600">
                            Ready to place your order as a walk-in guest.
                        </p>
                    </div>
                )}
                
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 transition-colors"
                >
                    {isLoading ? 'Verifying...' : (guestType === 'booked' ? 'Verify Booking' : 'Continue as Guest')}
                </button>
            </form>
        </div>
    );
};

export default CustomerVerify;