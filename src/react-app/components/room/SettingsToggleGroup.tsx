import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";

interface SettingsToggleGroupProps {
  label: string;
  options: readonly number[];
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  isDisabled?: (value: number) => boolean;
  suffix?: string;
  cols?: number;
}

export function SettingsToggleGroup({
  label,
  options,
  value,
  onChange,
  disabled,
  isDisabled,
  suffix = "s",
  cols = 5,
}: SettingsToggleGroupProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-3">
        {label}
      </label>
      <ToggleGroup
        value={[value.toString()]}
        onValueChange={(values) => {
          if (!disabled && values[0]) {
            onChange(Number(values[0]));
          }
        }}
        className={`grid gap-3`}
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        disabled={disabled}
      >
        {options.map((opt) => {
          const optValue = opt.toString();
          const optionDisabled = isDisabled?.(opt);
          return (
            <Toggle
              key={opt}
              value={optValue}
              disabled={optionDisabled}
              className={`py-3 rounded-xl border text-center transition-all data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed data-[pressed]:bg-gradient-to-r data-[pressed]:from-green-400 data-[pressed]:to-green-600 data-[pressed]:text-white bg-gray-700/50 border border-gray-600 text-gray-300 hover:bg-gray-600/50`}
            >
              {opt}
              {suffix}
            </Toggle>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
