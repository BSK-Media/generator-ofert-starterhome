
export enum InputType {
  SELECT = 'SELECT',
  RADIO = 'RADIO',
  CHECKBOX = 'CHECKBOX',
  NUMBER = 'NUMBER'
}

export interface OptionVariant {
  id: string;
  label: string;
  price: number;
  description?: string;
}

export interface ConfigCategory {
  id: string;
  title: string;
  iconName: string;
  inputType: InputType;
  variants?: OptionVariant[]; // For Select/Radio
  basePrice?: number; // For Checkbox
  unitPrice?: number; // For Number input (e.g. per m2)
  unitLabel?: string;
  info?: string; // Additional info (like for AC/PV)
}

export interface UserSelection {
  [categoryId: string]: string | boolean | number;
}

export interface HouseDetails {
  builtArea: string; // Powierzchnia zabudowy
  usableArea: string; // Powierzchnia użytkowa
  bedrooms: string | number;  // Liczba sypialni (np. 2 lub "3-4")
}

export interface House {
  id: string;
  name: string;
  status: 'COMPLETED' | 'DRAFT';

  /** Główne zdjęcie (hero / góra strony) */
  image: string;

  /** Zdjęcia do sekcji WIZUALIZACJA (grid / kolaż) */
  images?: string[];

  basePrice: number; // Stan surowy zamknięty
  developerPrice: number; // Stan deweloperski
  area: string;
  details?: HouseDetails;
  description?: string;
  floorPlanPdf?: string;
}
// New Structure for dynamic pricing
export interface OfferItemOption {
  id: string;
  name: string;
  price: number;
}

export interface OfferItem {
  code: string;
  name: string;
  description?: string;
  type: 'checkbox' | 'radio' | 'number';
  price?: number; // for checkbox base price or number unit price
  options?: OfferItemOption[]; // for radio
  defaultValue?: string | boolean | number;
  unit?: string; // for number
}
