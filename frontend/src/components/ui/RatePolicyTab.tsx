export default function RatePolicyTab({ isDiscountTab, setIsDiscountTab }: { isDiscountTab: boolean, setIsDiscountTab: (isDiscountTab: boolean) => void }) {
    return (
        <div className="flex items-center border-b border-gray-300 mb-4">
            <button
              className={`px-4 py-2 font-medium transition-colors duration-200  cursor-pointer ${
                !isDiscountTab
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-500 hover:text-indigo-600'
              } rounded-tl-md`}
              onClick={() => setIsDiscountTab(false)}
            >
              Single Policy
            </button>
            <button
              className={`px-4 py-2 font-medium transition-colors duration-200  cursor-pointer ${
                isDiscountTab
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-500 hover:text-indigo-600'
              } rounded-tr-md`}
              onClick={() => setIsDiscountTab(true)}
            >
              Discount Policy
            </button>
      </div>
    )
}
