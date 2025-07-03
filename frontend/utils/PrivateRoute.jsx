// utils/PrivateRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import Loader from "../src/components/loader/loader"; 

const PrivateRoute = () => {
  const { user, isLoading } = useSelector((state) => state.auth);


  // if (isLoading) {

  //   return (
  //      <Loader />
  //   );
  // }


  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;
