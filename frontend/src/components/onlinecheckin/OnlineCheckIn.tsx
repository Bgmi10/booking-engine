import { useOnlineCheckIn } from "../../context/OnlineCheckInContext"
import { OnlineCheckInForm } from "./OnlineCheckInForm"
import Header from "../Header"
import Loader from "../Loader"

export const OnlineCheckIn = () => {
    const { customer, loader } = useOnlineCheckIn();

    if (loader) {
        return <Loader />
    }

    if (!customer) {
        return (
            <>
                <Header />
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-2xl font-semibold text-gray-900 mb-4">
                            Unable to load check-in information
                        </h1>
                        <p className="text-gray-600">
                            Please contact reception for assistance.
                        </p>
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            <Header />
            <div className="min-h-screen bg-gray-50">
                <OnlineCheckInForm customer={customer} />
            </div>
        </>
    )
}