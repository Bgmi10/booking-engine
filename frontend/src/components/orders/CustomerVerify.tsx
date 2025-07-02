import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { baseUrl } from '../../utils/constants';

const CustomerVerify: React.FC<{ onVerificationSuccess: () => void }> = ({ onVerificationSuccess }) => {
    const [surname, setSurname] = useState('');
    const [roomName, setRoomName] = useState('');
    const [occupiedRooms, setOccupiedRooms] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOccupiedRooms = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${baseUrl}/customers/occupied-rooms`);
                const data = await response.json();
                if (response.ok) {
                    setOccupiedRooms(data.data);
                } else {
                    throw new Error(data.message || 'Failed to load rooms.');
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOccupiedRooms();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!surname || !roomName) {
            setError('Please provide your surname and select a room.');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${baseUrl}/customers/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ surname, roomName }),
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
        <div className="bg-white shadow-md rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Welcome</h2>
            <p className="text-center text-gray-600 mb-6">Please verify your stay to place an order.</p>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="surname" className="block text-sm font-medium text-gray-700">
                        Surname
                    </label>
                    <input
                        id="surname"
                        type="text"
                        value={surname}
                        onChange={(e) => setSurname(e.target.value)}
                        placeholder="Enter your surname (last name)"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        disabled={isLoading}
                    />
                </div>
                <div>
                    <label htmlFor="roomName" className="block text-sm font-medium text-gray-700">
                        Room
                    </label>
                    <select
                        id="roomName"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        disabled={isLoading || occupiedRooms.length === 0}
                    >
                        <option value="">{isLoading ? 'Loading rooms...' : 'Select your room'}</option>
                        {occupiedRooms.map((room) => (
                            <option key={room} value={room}>
                                {room}
                            </option>
                        ))}
                    </select>
                </div>
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        {isLoading ? 'Verifying...' : 'Continue'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CustomerVerify;