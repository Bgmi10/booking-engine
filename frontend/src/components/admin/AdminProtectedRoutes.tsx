import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Loader from "../Loader";
import type { User } from "../../types/types";

export default function AdminProtectedRoutes() {
    const { isAuthenticated, user, isLoading }: { isAuthenticated: boolean, user: User | null, isLoading: boolean } = useAuth();

    if (!isLoading) {
        return <Loader />;
    }

    return (
        <div>
            {isAuthenticated  && user?.role === "ADMIN" ? <Outlet /> : <Navigate to="/admin/login" />}
        </div>
    )
}
