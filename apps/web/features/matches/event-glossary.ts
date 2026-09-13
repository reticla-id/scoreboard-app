import type { EventType } from "./scoring";

export const EVENT_GLOSSARY: ReadonlyArray<{ code: EventType; name: string; description: string }> = [
  { code: "W", name: "Winner", description: "A clean offensive shot the opponent cannot touch, including aces." },
  { code: "FE", name: "Forced Error", description: "A missed shot caused by a difficult, aggressive opponent stroke." },
  { code: "UE", name: "Unforced Error", description: "An easy shot missed while balanced and under no pressure." },
  { code: "DF", name: "Double Fault", description: "Missing both the first and second serve attempts in a single point." },
];
