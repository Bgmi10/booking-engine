import { Navigate, Outlet } from "react-router-dom";
import { useOnlineCheckIn } from "../../context/OnlineCheckInContext"
import Loader from "../Loader";

export const OnlineCheckInProtectedRoutes = () => {
    const { customer, loader } = useOnlineCheckIn();

    // Show loading state while checking authentication
    if (loader) {
        return (
           <Loader />
        );
    }

    return(
        <div>
            {customer ? <Outlet /> : <Navigate to={'/'}/> }
        </div>
    )
}