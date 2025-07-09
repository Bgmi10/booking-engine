import { Navigate, Outlet } from "react-router-dom";
import { useWeddingPortalAuth } from "../../context/WeddingPortalAuthContext";
import Loader from "../Loader";
import type { User } from "../../types/types";

export default function WeddingPortalProtectedRoutes() {
    const { isAuthenticated, isLoading }: { isAuthenticated: boolean, user: User | null, isLoading: boolean } = useWeddingPortalAuth();

    if (isLoading) {
        return <Loader />;
    }

    return (
        <div>
            {isAuthenticated ? <Outlet /> : <Navigate to="/wedding-portal/login" />}
        </div>
    )
}