"use client";
import { ConnectionError } from "@/components/connection-error";
export default function Error({ reset }: { reset: () => void }) { return <ConnectionError onRetry={reset} />; }
