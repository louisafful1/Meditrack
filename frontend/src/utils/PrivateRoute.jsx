// utils/PrivateRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import Loader from "../components/loader/loader"; 

const PrivateRoute = () => {
  const { user, isLoading, isInitialized } = useSelector((state) => state.auth);

  // Show loader while checking authentication status
  if (isLoading || !isInitialized) {
    return (
       <Loader />
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;
