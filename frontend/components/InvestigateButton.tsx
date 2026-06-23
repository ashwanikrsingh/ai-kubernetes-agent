"use client";

import { useState } from "react";

export function InvestigateButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleInvestigate = () => {
    setIsLoading(true);
    console.log("Investigation started...");
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <button
      onClick={handleInvestigate}
      disabled={isLoading}
      className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition"
    >
      {isLoading ? "Investigating..." : "Investigate Cluster"}
    </button>
  );
}
