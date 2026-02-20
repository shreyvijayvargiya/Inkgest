import { useState, useEffect } from "react";
import LoginModal from "../lib/ui/LoginModal";
import { useSelector } from "react-redux";
import { useRouter } from "next/router";



export default function Login() {
	const [isOpen, setIsOpen] = useState(false);
	const { user } = useSelector((state) => state.user);
	const router = useRouter();

	useEffect(() => {
		if (user?.isAuthenticated) {
			router.push("/app");
		} else {
			setIsOpen(true);
		}
	}, [user?.isAuthenticated]);
	return <LoginModal isOpen={isOpen} onClose={() => router.push("/app")} />;
}
