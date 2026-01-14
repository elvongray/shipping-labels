import { create } from "zustand";

type WizardState = {
  canProceedToCheckout: boolean;
  setCanProceedToCheckout: (value: boolean) => void;
};

export const useWizardStore = create<WizardState>((set) => ({
  canProceedToCheckout: false,
  setCanProceedToCheckout: (value) => set({ canProceedToCheckout: value }),
}));
