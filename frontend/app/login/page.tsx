import { redirect } from "next/navigation";

// Ya no hay inicio de sesión: quien entre por /login va directo a la selección de rol.
export default function LoginPage() {
  redirect("/");
}
