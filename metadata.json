import { GoogleGenAI } from "@google/genai";
import { UserSelection, ConfigCategory, OptionVariant, InputType } from '../types';

const getLabelForValue = (category: ConfigCategory, value: any): string => {
  if (category.inputType === InputType.CHECKBOX) {
    return value ? 'Tak' : 'Nie';
  }
  if (category.inputType === InputType.NUMBER) {
    return `${value} ${category.unitLabel || ''}`;
  }
  if (category.variants) {
    const variant = category.variants.find(v => v.id === value);
    return variant ? variant.label : String(value);
  }
  return String(value);
};

export const generateConfigDescription = async (selection: UserSelection, configData: ConfigCategory[]): Promise<string> => {
  if (!process.env.API_KEY) {
    console.warn("API Key is missing!");
    return "API Key is missing. Cannot generate AI description.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Construct a readable summary for the prompt
  let configSummary = "Konfiguracja Domu Modułowego:\n";
  
  configData.forEach(category => {
    const value = selection[category.id];
    if (value !== undefined && value !== false && value !== 0 && value !== 'none') {
       configSummary += `- ${category.title}: ${getLabelForValue(category, value)}\n`;
    }
  });

  const prompt = `
    Jesteś profesjonalnym doradcą ds. nieruchomości i architektem. 
    Na podstawie poniższej konfiguracji technicznej domu modułowego, napisz atrakcyjny opis sprzedażowy dla klienta (2-3 akapity).
    Język: Polski.
    Ton: Profesjonalny, zachęcający, podkreślający komfort i wybrane udogodnienia.
    
    Nie wymieniaj po prostu listy, ale stwórz spójną narrację o tym, jak będzie się mieszkać w tym domu z wybranymi opcjami.
    
    Dane:
    ${configSummary}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || "Nie udało się wygenerować opisu.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Wystąpił błąd podczas generowania opisu przez AI.";
  }
};