import type { StoreSettings } from "./types";

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "Warbul Coffee",
  branch: "Dipatiukur",
  address: "Jl. Dipatiukur No. 42, Bandung",
  phone: "0812-3456-7890",
  hoursOpen: "08:00",
  hoursClose: "22:00",
  qrisMerchant: "WARBUL COFFEE DIPATIUKUR",
  serviceFee: 2000,
  payQris: true,
  payKasir: true,
  notifyNewOrder: true,
  notifyOutOfStock: true,
  notifyDailyReport: false,
};
