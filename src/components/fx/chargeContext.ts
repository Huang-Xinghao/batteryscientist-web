import { createContext, useContext } from 'react';

export type PreloadTask = { label: string; run: () => Promise<unknown> };
export type ChargeOptions = {
  to: string;
  /** Screen point the overlay grows from, usually the clicked button. */
  from?: { x: number; y: number };
  tasks?: PreloadTask[];
};

export const ChargeContext = createContext<(options: ChargeOptions) => void>(() => {});

/** Navigate with a full-screen "charging" transition while the next page's data loads. */
export function useChargeNavigate() {
  return useContext(ChargeContext);
}
