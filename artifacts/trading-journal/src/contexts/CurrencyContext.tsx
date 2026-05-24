import { createContext, useContext, useState, useCallback } from "react";

export interface CurrencyOption {
  code: string;
  symbol: string;
  locale: string;
  name: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: "USD", symbol: "$",  locale: "en-US", name: "US Dollar"        },
  { code: "EUR", symbol: "€",  locale: "de-DE", name: "Euro"             },
  { code: "GBP", symbol: "£",  locale: "en-GB", name: "British Pound"    },
  { code: "JPY", symbol: "¥",  locale: "ja-JP", name: "Japanese Yen"     },
  { code: "CAD", symbol: "C$", locale: "en-CA", name: "Canadian Dollar"  },
  { code: "AUD", symbol: "A$", locale: "en-AU", name: "Australian Dollar"},
  { code: "CHF", symbol: "Fr", locale: "de-CH", name: "Swiss Franc"      },
  { code: "INR", symbol: "₹",  locale: "en-IN", name: "Indian Rupee"     },
  { code: "CNY", symbol: "¥",  locale: "zh-CN", name: "Chinese Yuan"     },
  { code: "SGD", symbol: "S$", locale: "en-SG", name: "Singapore Dollar" },
  { code: "HKD", symbol: "HK$",locale: "zh-HK", name: "Hong Kong Dollar" },
  { code: "BRL", symbol: "R$", locale: "pt-BR", name: "Brazilian Real"   },
  { code: "MXN", symbol: "MX$",locale: "es-MX", name: "Mexican Peso"     },
  { code: "KRW", symbol: "₩",  locale: "ko-KR", name: "Korean Won"       },
  { code: "TRY", symbol: "₺",  locale: "tr-TR", name: "Turkish Lira"     },
];

const LS_KEY = "tj_currency";

function loadSaved(): CurrencyOption {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as CurrencyOption;
      const match = CURRENCIES.find(c => c.code === saved.code);
      if (match) return match;
    }
  } catch { /* ignore */ }
  return CURRENCIES[0]; // USD default
}

interface CurrencyContextType {
  currency: CurrencyOption;
  setCurrency: (c: CurrencyOption) => void;
  format: (value: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyOption>(loadSaved);

  const setCurrency = useCallback((c: CurrencyOption) => {
    setCurrencyState(c);
    try { localStorage.setItem(LS_KEY, JSON.stringify(c)); } catch { /* ignore */ }
  }, []);

  const format = useCallback((value: number): string => {
    const abs  = Math.abs(value);
    const sign = value < 0 ? "-" : value > 0 ? "+" : "";

    // JPY and KRW use no decimal places
    const noDecimals = ["JPY", "KRW"].includes(currency.code);
    const formatted  = abs.toLocaleString(currency.locale, {
      minimumFractionDigits: noDecimals ? 0 : 2,
      maximumFractionDigits: noDecimals ? 0 : 2,
    });
    return `${sign}${currency.symbol}${formatted}`;
  }, [currency]);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, format }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
