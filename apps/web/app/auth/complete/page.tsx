import { redirect } from "next/navigation";
import { requireUserId, getProfile } from "@/lib/auth";

export default async function AuthComplete() {
  const id = await requireUserId();
  redirect((await getProfile(id)) ? "/home" : "/profile/setup");
}
