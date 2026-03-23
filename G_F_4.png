
import React from 'react';
import { ConfigCategory, InputType } from '../types';
import { getIcon } from '../constants';
import { Check, Plus, Minus } from 'lucide-react';

interface OptionCardProps {
  category: ConfigCategory;
  value: any;
  onChange: (id: string, value: any) => void;
}

export const OptionCard: React.FC<OptionCardProps> = ({ category, value, onChange }) => {
  
  const renderInput = () => {
    switch (category.inputType) {
      case InputType.RADIO:
        return (
          <div className="grid grid-cols-1 gap-3 mt-6">
            {category.variants?.map((variant) => {
              const isSelected = value === variant.id;
              return (
                <div 
                  key={variant.id}
                  onClick={() => onChange(category.id, variant.id)}
                  className={`
                    relative flex items-start p-4 sm:p-5 border cursor-pointer transition-all duration-200 group
                    ${isSelected 
                      ? 'border-[#6E8809] bg-[#f7faf3] ring-1 ring-[#6E8809]' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <div className={`
                    mt-1 w-5 h-5 border flex items-center justify-center transition-colors shrink-0
                    ${isSelected ? 'bg-[#6E8809] border-[#6E8809]' : 'bg-white border-gray-300 group-hover:border-gray-400'}
                  `}>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  
                  <div className="ml-4 flex-1">
                    <div className="flex justify-between items-start gap-2">
                      <span className={`text-sm sm:text-base font-semibold ${isSelected ? 'text-[#6E8809]' : 'text-gray-900'}`}>
                        {variant.label}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-gray-900 whitespace-nowrap">
                        {variant.price === 0 ? 'W cenie' : `+ ${variant.price.toLocaleString()} zł`}
                      </span>
                    </div>
                    {variant.description && (
                      <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">{variant.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );

      case InputType.SELECT:
        return (
          <div className="grid grid-cols-1 gap-3 mt-6">
            {category.variants?.map((variant) => {
               const isSelected = value === variant.id;
               return (
                <div 
                  key={variant.id}
                  onClick={() => onChange(category.id, variant.id)}
                  className={`
                    relative flex items-center p-3 sm:p-4 border cursor-pointer transition-all duration-200
                    ${isSelected 
                      ? 'border-[#6E8809] bg-[#f7faf3] ring-1 ring-[#6E8809]' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <div className={`
                    w-5 h-5 border flex items-center justify-center transition-colors shrink-0
                    ${isSelected ? 'bg-[#6E8809] border-[#6E8809]' : 'bg-white border-gray-300'}
                  `}>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <div className="ml-4 flex-1 flex justify-between items-center gap-2">
                    <span className={`text-sm sm:text-base font-medium ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                      {variant.label}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-gray-900 whitespace-nowrap">
                        {variant.price === 0 ? '-' : `+ ${variant.price.toLocaleString()} zł`}
                    </span>
                  </div>
                </div>
               );
            })}
          </div>
        );

      case InputType.CHECKBOX:
        const isChecked = !!value;
        return (
          <div className="mt-6">
            <div 
              onClick={() => onChange(category.id, !isChecked)}
              className={`
                flex items-center p-4 sm:p-5 border cursor-pointer transition-all duration-200 group
                ${isChecked 
                  ? 'border-[#6E8809] bg-[#f7faf3] ring-1 ring-[#6E8809]' 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              <div className={`
                w-6 h-6 border flex items-center justify-center transition-colors shrink-0
                ${isChecked ? 'bg-[#6E8809] border-[#6E8809]' : 'bg-white border-gray-300 group-hover:border-gray-400'}
              `}>
                 {isChecked && <Check className="w-4 h-4 text-white" />}
              </div>
              
              <div className="ml-4 flex-1 flex justify-between items-center gap-2">
                <span className={`text-base sm:text-lg font-medium ${isChecked ? 'text-[#6E8809]' : 'text-gray-900'}`}>
                  Tak, dodaj ten pakiet
                </span>
                <span className="text-base sm:text-lg font-bold text-gray-900 whitespace-nowrap">
                  + {category.basePrice?.toLocaleString()} zł
                </span>
              </div>
            </div>
          </div>
        );

      case InputType.NUMBER:
        return (
          <div className="mt-6 bg-[#f7faf3] border border-[#e2e8da] p-4 sm:p-6">
             <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center">
                <div className="w-full sm:w-1/2">
                    <label className="block text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Ilość ({category.unitLabel})
                    </label>
                    <div className="flex items-center">
                        <button 
                          onClick={() => onChange(category.id, Math.max(0, (value || 0) - 1))}
                          className="w-10 h-10 sm:w-12 sm:h-12 bg-white border border-gray-200 hover:border-[#6E8809] text-gray-600 flex items-center justify-center transition-colors"
                        >
                            <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={value || 0}
                          onChange={(e) => onChange(category.id, Math.max(0, parseInt(e.target.value) || 0))}
                          className="flex-1 h-10 sm:h-12 border-y border-gray-200 text-center text-lg sm:text-xl font-medium focus:outline-none focus:bg-white bg-white"
                        />
                         <button 
                          onClick={() => onChange(category.id, (value || 0) + 1)}
                          className="w-10 h-10 sm:w-12 sm:h-12 bg-white border border-gray-200 hover:border-[#6E8809] text-gray-600 flex items-center justify-center transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                
                <div className="w-full sm:w-1/2 flex flex-col items-end justify-center border-t sm:border-t-0 sm:border-l border-gray-200 pt-4 sm:pt-0 sm:pl-6">
                    <span className="text-xs sm:text-sm text-gray-500 mb-1">Koszt dodatkowy:</span>
                    <span className="text-xl sm:text-2xl font-bold text-[#6E8809]">
                       + {((value || 0) * (category.unitPrice || 0)).toLocaleString()} zł
                    </span>
                    <span className="text-[10px] sm:text-xs text-gray-400 mt-1">
                        ({category.unitPrice?.toLocaleString()} zł / {category.unitLabel})
                    </span>
                </div>
             </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white transition-all duration-300">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-gray-50 text-[#6E8809] border border-gray-100 shrink-0">
          {getIcon(category.iconName)}
        </div>
        <div className="flex-1 pt-1">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 uppercase tracking-wide">{category.title}</h3>
            {category.info && (
                <div className="mt-2 text-xs sm:text-sm text-gray-500 bg-gray-50 p-2 border-l-2 border-[#6E8809] inline-block">
                {category.info}
                </div>
            )}
        </div>
      </div>
      
      <div className="ml-0 md:ml-16">
        {renderInput()}
      </div>
    </div>
  );
};
