import { redirect } from "next/navigation";

export default function WithdrawalsRedirectPage() {
  redirect("/wallet-operations");
}
