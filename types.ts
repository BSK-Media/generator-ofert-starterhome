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
  variants?: OptionVariant[];
  basePrice?: number;
  unitPrice?: number;
  unitLabel?: string;
  info?: string;
}

export interface UserSelection {
  [categoryId: string]: string | boolean | number;
}

export interface HouseDetails {
  builtArea: string;
  usableArea: string;
  bedrooms: string | number;
}

export interface House {
  id: string;
  name: string;
  status: 'COMPLETED' | 'DRAFT';

  /** Główne zdjęcie (hero / góra strony) */
  image: string;

  /** Zdjęcia do sekcji WIZUALIZACJA (grid / kolaż) */
  images?: string[];

  basePrice: number;
  developerPrice: number;
  area: string;
  details?: HouseDetails;
  description?: string;
  floorPlanPdf?: string;
}

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
  price?: number;
  options?: OfferItemOption[];
  defaultValue?: string | boolean | number;
  unit?: string;
}
