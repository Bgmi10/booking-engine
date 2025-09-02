import React from "react"
import { CheckCircle, Key } from "lucide-react"
import { useNavigate } from "react-router-dom"

export const CheckInSuccess: React.FC = () => {
  const navigate = useNavigate()

  const handleFinish = () => {
    navigate("/online-checkin/home")
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            La Torre sulla via Francigena
          </h1>
        </div>

        {/* Success Message */}
        <div className="bg-white rounded-xl p-6 shadow-sm border text-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            All set to enjoy your stay
          </h2>
          
          {/* Key Icon and Message */}
          <div className="bg-blue-50 rounded-xl p-6 mb-6 border border-blue-100">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Key className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Keys at reception</h3>
            <p className="text-gray-600">
              Go to the reception to get your keys
            </p>
          </div>

          {/* Finish Button */}
          <button
            onClick={handleFinish}
            className="w-full bg-gray-900 text-white py-4 px-6 rounded-xl font-medium hover:bg-gray-800 transition-colors"
          >
            Finish
          </button>
        </div>

        {/* Additional Info */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Welcome to La Torre! We hope you have a wonderful stay.
          </p>
        </div>
      </div>
    </div>
  )
}