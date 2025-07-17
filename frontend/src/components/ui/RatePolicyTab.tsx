export default function RatePolicyTab({ isDiscountTab, setIsDiscountTab }: { isDiscountTab: boolean, setIsDiscountTab: (isDiscountTab: boolean) => void }) {
    return (
        <div className="flex justify-center mb-6">
            <div className="bg-gray-200 rounded-lg p-1 flex">
                <button
                    onClick={() => setIsDiscountTab(false)}
                    className={`px-6 py-2 rounded-md font-semibold text-sm transition-all ${
                        !isDiscountTab ? 'bg-white text-blue-600 shadow' : 'text-gray-600'
                    }`}
                >
                    Rate Policy
                </button>
                <button
                    onClick={() => setIsDiscountTab(true)}
                    className={`px-6 py-2 rounded-md font-semibold text-sm transition-all ${
                        isDiscountTab ? 'bg-white text-blue-600 shadow' : 'text-gray-600'
                    }`}
                >
                    Discount Policy
                </button>
            </div>
        </div>
    )
}
