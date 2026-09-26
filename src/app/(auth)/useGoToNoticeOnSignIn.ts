import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Sends a newly signed-in player to the boot notice; clicking through it starts the home menu music. */
export function useGoToNoticeOnSignIn(signedIn: boolean | undefined) {
  const router = useRouter();
  useEffect(() => {
    if (signedIn) router.replace("/notice");
  }, [signedIn, router]);
}
