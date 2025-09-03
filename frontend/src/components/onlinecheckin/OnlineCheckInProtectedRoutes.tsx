import { Navigate, Outlet } from "react-router-dom";
import { useOnlineCheckIn } from "../../context/OnlineCheckInContext"
import Loader from "../Loader";

export const OnlineCheckInProtectedRoutes = () => {
    const { customer, loader } = useOnlineCheckIn();

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