"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";

export function LabeledField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  type?: string;
}) {
  return (
    <LabeledField label={label} hint={hint}>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </LabeledField>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  className,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  className?: string;
  rows?: number;
}) {
  return (
    <LabeledField label={label} hint={hint}>
      <Textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn("resize-y", className)}
      />
    </LabeledField>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  hint?: string;
}) {
  return (
    <LabeledField label={label} hint={hint}>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </LabeledField>
  );
}

export function SwitchField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-md border p-3 text-sm">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function IconBtn({
  onClick,
  title,
  children,
  danger,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", danger && "text-destructive hover:text-destructive")}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      {children}
    </Button>
  );
}

export function ItemCard({
  title,
  onRemove,
  onMoveUp,
  onMoveDown,
  children,
  defaultOpen = true,
}: {
  title: string;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
        <button
          type="button"
          className="text-left text-sm font-medium hover:text-primary"
          onClick={() => setOpen((o) => !o)}
        >
          {title}
        </button>
        <div className="flex items-center gap-1">
          {onMoveUp && (
            <IconBtn onClick={onMoveUp} title="上移">
              <ChevronUp className="h-4 w-4" />
            </IconBtn>
          )}
          {onMoveDown && (
            <IconBtn onClick={onMoveDown} title="下移">
              <ChevronDown className="h-4 w-4" />
            </IconBtn>
          )}
          {onRemove && (
            <IconBtn onClick={onRemove} title="删除" danger>
              <Trash2 className="h-4 w-4" />
            </IconBtn>
          )}
        </div>
      </CardHeader>
      {open && <CardContent className="space-y-3">{children}</CardContent>}
    </Card>
  );
}
