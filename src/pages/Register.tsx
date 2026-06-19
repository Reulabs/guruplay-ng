import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const Register = () => {
  const navigate = useNavigate();
  const { openAuthDialog } = useAuth();

  useEffect(() => {
    openAuthDialog("signup");
    navigate("/", { replace: true });
  }, [navigate, openAuthDialog]);

  return null;
};

export default Register;
