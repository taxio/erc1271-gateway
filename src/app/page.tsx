"use client";

import { ThirdwebProvider } from "@thirdweb-dev/react";
import Wallet from "@/app/wallet";

export default function Home() {
  return (
    <ThirdwebProvider>
      <Wallet />
    </ThirdwebProvider>
  );
}
