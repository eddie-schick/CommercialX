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
  disabled?: boolean;
  waitForValidation?: boolean; // If true, won't auto-decode until explicitly enabled
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
  disabled = false,
  waitForValidation = false,
  ...props
}: VINInputProps) {
  const [decodeStatus, setDecodeStatus] = React.useState<"idle" | "success" | "error">("idle");
  const [decodeError, setDecodeError] = React.useState<string | null>(null);
  const lastDecodedVIN = React.useRef<string>("");
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Validate VIN format
  const isValidFormat = React.useMemo(() => {
    if (!value) return false;
    if (value.length !== 17) return false;
    const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
    return vinRegex.test(value);
  }, [value]);

  const decodeMutation = trpc.vin.decode.useMutation({
    onMutate: () => {
      console.log("[VINInput] Starting VIN decode mutation for:", value);
      setDecodeStatus("idle");
      setDecodeError(null);
    },
    onSuccess: (result) => {
      // Clear any timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      console.log("[VINInput] VIN decode success:", result);
      
      if (result.success && result.data) {
        setDecodeStatus("success");
        lastDecodedVIN.current = value;
        setDecodeError(null);
        console.log("[VINInput] Calling onDecode callback with data");
        onDecode?.(result.data);
      } else {
        const errorMessage = result.error || "Failed to decode VIN";
        console.error("[VINInput] Decode returned unsuccessful result:", result);
        setDecodeError(errorMessage);
        setDecodeStatus("error");
        onDecodeError?.(errorMessage);
      }
    },
    onError: (err) => {
      // Clear any timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      console.error("[VINInput] VIN decode error:", err);
      console.error("[VINInput] Error details:", {
        message: err.message,
        data: err.data,
        shape: err.shape,
        cause: err.cause,
      });
      
      const errorMessage = err.message || "Failed to decode VIN";
      setDecodeError(errorMessage);
      setDecodeStatus("error");
      onDecodeError?.(errorMessage);
    },
    onSettled: () => {
      console.log("[VINInput] VIN decode mutation settled (completed)");
    },
  });

  // Use mutation's isPending state instead of managing our own
  const isDecoding = decodeMutation.isPending;
  
  const handleDecode = async () => {
    if (!isValidFormat) {
      setDecodeError("VIN must be exactly 17 characters and cannot contain I, O, or Q");
      setDecodeStatus("error");
      return;
    }

    setDecodeStatus("idle");
    setDecodeError(null);

    // Set a timeout to prevent infinite loading (30 seconds)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      if (decodeMutation.isPending) {
        console.error("VIN decode timeout after 30 seconds");
        setDecodeError("Request timed out. Please check your connection and try again.");
        setDecodeStatus("error");
        onDecodeError?.("Request timed out. Please check your connection and try again.");
        // Reset mutation state
        decodeMutation.reset();
      }
    }, 30000);

    decodeMutation.mutate({ vin: value });
  };

  // Auto-decode when VIN reaches 17 characters
  // Only if waitForValidation is false (user validation complete) or disabled is false
  React.useEffect(() => {
    // Don't auto-decode if waiting for validation or if disabled
    if (waitForValidation || disabled) {
      return;
    }
    
    if (isValidFormat && value.length === 17 && value !== lastDecodedVIN.current && !isDecoding) {
      setDecodeStatus("idle");
      setDecodeError(null);

      // Set a timeout to prevent infinite loading (30 seconds)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        if (decodeMutation.isPending) {
          console.error("VIN decode timeout after 30 seconds");
          setDecodeError("Request timed out. Please check your connection and try again.");
          setDecodeStatus("error");
          onDecodeError?.("Request timed out. Please check your connection and try again.");
          decodeMutation.reset();
        }
      }, 30000);

      decodeMutation.mutate({ vin: value });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, isValidFormat, isDecoding, waitForValidation, disabled]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent form submission when Enter is pressed
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      // If VIN is complete and valid, trigger decode manually
      if (isValidFormat && value.length === 17 && value !== lastDecodedVIN.current && !isDecoding) {
        handleDecode();
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
            onKeyDown={handleKeyDown}
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

