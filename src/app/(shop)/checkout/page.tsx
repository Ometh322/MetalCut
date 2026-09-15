import CheckoutForm from "@/components/cart/CheckoutForm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "Оформление заявки — MetalCut" };

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  return <CheckoutForm user={user ? { name: user.name ?? "", phone: user.phone ?? "", email: user.email } : null} />;
}
