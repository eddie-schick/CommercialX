"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";

export interface SmartComboboxProps {
  value?: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  onSearch?: (searchTerm: string) => Promise<Array<{ value: string; label: string }>>;
  allowCreate?: boolean;
  placeholder?: string;
  label?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function SmartCombobox({
  value,
  onChange,
  options: initialOptions,
  onSearch,
  allowCreate = false,
  placeholder = "Search or select...",
  label,
  description,
  error,
  disabled,
  className,
}: SmartComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [options, setOptions] = React.useState(initialOptions);
  const [isSearching, setIsSearching] = React.useState(false);

  // Find selected option
  const selectedOption = React.useMemo(() => {
    return options.find((opt) => opt.value === value);
  }, [options, value]);

  // Handle search
  React.useEffect(() => {
    if (onSearch && searchTerm) {
      setIsSearching(true);
      onSearch(searchTerm)
        .then((results) => {
          setOptions(results);
          setIsSearching(false);
        })
        .catch(() => {
          setIsSearching(false);
        });
    } else if (!onSearch) {
      // Filter local options
      const filtered = initialOptions.filter((opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setOptions(filtered);
    }
  }, [searchTerm, onSearch, initialOptions]);

  // Reset options when popover closes
  React.useEffect(() => {
    if (!open) {
      setSearchTerm("");
      setOptions(initialOptions);
    }
  }, [open, initialOptions]);

  const handleSelect = (selectedValue: string) => {
    if (selectedValue === "__create__") {
      // Create new option from search term
      onChange(searchTerm);
      setOpen(false);
    } else {
      onChange(selectedValue === value ? "" : selectedValue);
      setOpen(false);
    }
  };

  const showCreateOption = allowCreate && searchTerm && !selectedOption;

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            {selectedOption ? selectedOption.label : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              <CommandEmpty>
                {isSearching ? (
                  "Searching..."
                ) : showCreateOption ? (
                  <div className="py-2">
                    <CommandItem
                      value="__create__"
                      onSelect={handleSelect}
                      className="text-primary"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create new: &quot;{searchTerm}&quot;
                    </CommandItem>
                  </div>
                ) : (
                  "No results found."
                )}
              </CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={handleSelect}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
                {showCreateOption && (
                  <CommandItem
                    value="__create__"
                    onSelect={handleSelect}
                    className="text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create new: &quot;{searchTerm}&quot;
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

