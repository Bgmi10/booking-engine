import { RiCloseLine } from "react-icons/ri";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
}

interface Category {
  id: string;
  name: string;
  orderItems: OrderItem[];
}

interface ViewCategoryProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
}

export default function ViewCategoryProductsModal({
  isOpen,
  onClose,
  category,
}: ViewCategoryProductsModalProps) {
  if (!isOpen || !category) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center border-b p-5">
          <h3 className="text-xl font-semibold text-gray-900">
            Products in "{category.name}"
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
          >
            <RiCloseLine size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {category.orderItems.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              There are no products assigned to this category.
            </p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {category.orderItems.map((item) => (
                <li key={item.id} className="py-3 flex items-center">
                  <img
                    className="h-16 w-16 rounded-md object-cover"
                    src={item.imageUrl}
                    alt={item.name}
                  />
                  <div className="ml-4 flex-grow">
                    <p className="text-md font-medium text-gray-900">
                      {item.name}
                    </p>
                  </div>
                  <p className="text-md font-semibold text-gray-700">
                    {formatPrice(item.price)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end rounded-b-lg border-t">
          <button
            type="button"
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 