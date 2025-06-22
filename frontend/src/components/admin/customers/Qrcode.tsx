import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { baseUrl } from "../../../utils/constants";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle, XCircle, Loader } from "lucide-react";
import { currencies } from "./CurrencySelectionModal";

const Timer = ({ expiryDate }: { expiryDate: string | null }) => {
    const [timeLeft, setTimeLeft] = useState({ minutes: 0, seconds: 0 });

    useEffect(() => {
        if (!expiryDate) return;

        const calculateTimeLeft = () => {
            const difference = +new Date(expiryDate) - +new Date();
            if (difference > 0) {
                return {
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60),
                };
            }
            return { minutes: 0, seconds: 0 };
        };

        // Set the initial value
        setTimeLeft(calculateTimeLeft());

        const intervalId = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        // Clear interval on cleanup
        return () => clearInterval(intervalId);
    }, [expiryDate]);

    return (
        <span className="font-semibold">
            {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
        </span>
    );
};

export default function Qrcode() {
    const { id } = useParams<{ id: string }>();
    const [charge, setCharge] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCharge = async () => {
            if (!id) return;
            try {
                const response = await fetch(baseUrl + `/admin/charges/${id}`, {
                    method: "GET",
                    credentials: "include"
                });
                if (!response.ok) {
                    throw new Error("Charge not found");
                }
                const data = await response.json();
                setCharge(data.data);
            } catch (e: any) {
                setError(e.message || "Failed to fetch charge details.");
            } finally {
                if (loading) setLoading(false);
            }
        }
        
        fetchCharge();
        const interval = setInterval(() => {
            if (charge && charge.status !== 'PENDING') {
                clearInterval(interval);
                return;
            }
            fetchCharge();
        }, 4000);

        return () => clearInterval(interval);
    }, [id, charge?.status]);


    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex flex-col items-center justify-center text-center p-8 h-full">
                    <Loader className="animate-spin text-blue-600 mb-4" size={48} />
                    <p className="text-gray-600">Loading Payment Details...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center text-center p-8 h-full">
                    <XCircle className="text-red-500 mb-4" size={48} />
                    <p className="font-semibold text-red-600">Error</p>
                    <p className="text-gray-600">{error}</p>
                </div>
            );
        }

        if (!charge) return null;

        const currencyInfo = currencies.find(c => c.code === charge.currency.toUpperCase());
        const currencySymbol = currencyInfo?.symbol || charge.currency.toUpperCase();

        if (charge.status === 'SUCCEEDED') {
            return (
                <div className="flex flex-col items-center justify-center text-center p-8 bg-green-50 h-full">
                    <CheckCircle className="text-green-500 mb-4" size={64} />
                    <h2 className="text-2xl font-bold text-green-800">Payment Successful!</h2>
                    <p className="text-gray-700 mt-2">The payment of {currencySymbol}{charge.amount} has been completed.</p>
                </div>
            )
        }
        
        if (charge.status === 'FAILED' || new Date(charge.expiredAt) < new Date()) {
             return (
                <div className="flex flex-col items-center justify-center text-center p-8 bg-red-50 h-full">
                    <XCircle className="text-red-500 mb-4" size={64} />
                    <h2 className="text-2xl font-bold text-red-800">Payment Failed or Expired</h2>
                     <p className="text-gray-700 mt-2">This payment session could not be completed.</p>
                </div>
            )
        }

        return (
            <div className="p-6 text-center flex flex-col justify-center items-center h-full">
                <img src="/assets/logo.png" className="w-22"/>
                <h2 className="text-2xl font-bold text-gray-800">Scan to Pay</h2>
          
                <div className="my-4 inline-block p-4 border rounded-lg bg-white shadow-md">
                    <QRCodeSVG
                        bgColor="#FFFFFF"
                        fgColor="#000000"
                        level="Q"
                        style={{ width: 520 }}
                        value={charge.gatekeeperUrl || ""}
                        className="h-60"
                    />
                </div>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                    {currencySymbol}{charge.amount}
                </div>
                <p className="text-gray-600 my-2">{charge.description}</p>
                <div className="text-sm text-gray-500 bg-gray-100 rounded-full px-3 py-1 inline-block">
                    Expires in <Timer expiryDate={charge.expiredAt} />
                </div>
            </div>
        )
    };
    
    return (
         <div className="bg-gray-50 min-h-screen flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full m-auto flex flex-col h-[95vh] max-h-[720px] relative overflow-hidden">
               {renderContent()}
            </div>
        </div>
    )
}