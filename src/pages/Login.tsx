import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { openAuthDialog } = useAuth();

  useEffect(() => {
    openAuthDialog("login");
    navigate("/", { replace: true });
  }, [navigate, openAuthDialog]);

  return null;
};

export default Login;
