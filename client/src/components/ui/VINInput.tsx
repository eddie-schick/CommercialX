"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

export interface VINInputProps extends Omit<React.ComponentProps<typeof Input>, "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
  onDecode?: (decodedData: any) => void;
  onDecodeError?: (error: string) => void;
  label?: string;
  description?: string;
  error?: string;
}

export function VINInput({
  value,
  onChange,
  onDecode,
  onDecodeError,
  label,
  description,
  error,
  className,
  ...props
}: VINInputProps) {
  const [isDecoding, setIsDecoding] = React.useState(false);
  const [decodeStatus, setDecodeStatus] = React.useState<"idle" | "success" | "error">("idle");
  const [decodeError, setDecodeError] = React.useState<string | null>(null);
  const lastDecodedVIN = React.useRef<string>("");

  // Validate VIN format
  const isValidFormat = React.useMemo(() => {
    if (!value) return false;
    if (value.length !== 17) return false;
    const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
    return vinRegex.test(value);
  }, [value]);

  const decodeMutation = trpc.vin.decode.useMutation({
    onSuccess: (result) => {
      if (result.success && result.data) {
        setDecodeStatus("success");
        lastDecodedVIN.current = value;
        onDecode?.(result.data);
        setIsDecoding(false);
      } else {
        const errorMessage = result.error || "Failed to decode VIN";
        setDecodeError(errorMessage);
        setDecodeStatus("error");
        onDecodeError?.(errorMessage);
        setIsDecoding(false);
      }
    },
    onError: (err) => {
      console.error("VIN decode error:", err);
      const errorMessage = err.message || "Failed to decode VIN";
      setDecodeError(errorMessage);
      setDecodeStatus("error");
      onDecodeError?.(errorMessage);
      setIsDecoding(false);
    },
  });
  
  const handleDecode = async () => {
    if (!isValidFormat) {
      setDecodeError("VIN must be exactly 17 characters and cannot contain I, O, or Q");
      setDecodeStatus("error");
      return;
    }

    setIsDecoding(true);
    setDecodeStatus("idle");
    setDecodeError(null);

    decodeMutation.mutate({ vin: value });
  };

  // Auto-decode when VIN reaches 17 characters
  React.useEffect(() => {
    if (isValidFormat && value.length === 17 && value !== lastDecodedVIN.current && !isDecoding) {
      setIsDecoding(true);
      setDecodeStatus("idle");
      setDecodeError(null);
      decodeMutation.mutate({ vin: value });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, isValidFormat, isDecoding]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    // Only allow valid VIN characters
    const filtered = newValue.replace(/[^A-HJ-NPR-Z0-9]/g, "");
    if (filtered.length <= 17) {
      onChange(filtered);
      // Reset status when user types (only if VIN length changes)
      if (filtered.length !== 17 && decodeStatus !== "idle") {
        setDecodeStatus("idle");
        setDecodeError(null);
        lastDecodedVIN.current = "";
      }
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            value={value}
            onChange={handleInputChange}
            placeholder="Enter 17-character VIN"
            maxLength={17}
            className={cn(
              "uppercase font-mono",
              decodeStatus === "success" && "border-green-500",
              decodeStatus === "error" && "border-red-500",
              className
            )}
            {...props}
          />
          {isDecoding && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
          )}
          {decodeStatus === "success" && !isDecoding && (
            <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
          )}
          {decodeStatus === "error" && !isDecoding && (
            <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
          )}
        </div>
      </div>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {(error || decodeError) && (
        <p className="text-sm text-destructive">{error || decodeError}</p>
      )}
      {decodeStatus === "success" && !error && !decodeError && (
        <p className="text-sm text-green-600">VIN decoded successfully</p>
      )}
    </div>
  );
}

