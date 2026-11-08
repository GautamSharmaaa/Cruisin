"use client";
import {
  forwardRef,
  useId,
  useEffect,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  Dialog as D,
  AlertDialog as A,
  DropdownMenu as Menu,
  Tabs as T,
  Tooltip as Tip,
  Popover,
  Select as S,
} from "radix-ui";
import { ThemeProvider as NextThemeProvider, useTheme } from "next-themes";
import { Toaster, toast } from "sonner";
import { Command } from "cmdk";
import { DayPicker } from "react-day-picker";
import { OTPInput } from "input-otp";
import { UI_COPY as C } from "./constants/copy";
export { toast, Toaster, Command, DayPicker, OTPInput };
export const cn = (...classes: (string | false | null | undefined)[]): string =>
  classes.filter(Boolean).join(" ");
export interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: string;
  storageKey?: string;
}
export function ThemeProvider({ children, defaultTheme = "dark", storageKey = "cruisin-theme" }: ThemeProviderProps): ReactNode {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem
      storageKey={storageKey}
      disableTransitionOnChange
    >
      {children}
      <Toaster richColors position="bottom-right" />
    </NextThemeProvider>
  );
}
export function ThemeSelect(): ReactNode {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <label className="ui-theme">
      <span>{C.theme}</span>
      <select
        aria-label={C.theme}
        value={mounted ? (theme ?? "dark") : ""}
        onChange={(e) => setTheme(e.target.value)}
      >
        <option disabled value="">
          {C.select}
        </option>
        {(["light", "dark", "system"] as const).map((x) => (
          <option key={x} value={x}>
            {C[x]}
          </option>
        ))}
      </select>
    </label>
  );
}
export interface ButtonProps extends ComponentProps<"button"> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = "primary", type = "button", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn("ui-button", `ui-button-${variant}`, className)}
        {...props}
      />
    );
  },
);
export interface CardProps extends ComponentProps<"section"> {
  title?: string;
}
export function Card({
  children,
  title,
  className,
  ...props
}: CardProps): ReactNode {
  return (
    <section className={cn("ui-card", className)} {...props}>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}
export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(
  function Input({ className, ...props }, ref) {
    return <input className={cn("ui-input", className)} ref={ref} {...props} />;
  },
);
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  ComponentProps<"textarea">
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea className={cn("ui-input", className)} ref={ref} {...props} />
  );
});
export interface FieldProps {
  label: string;
  children: ReactNode;
  error?: string;
}
export function Field({ label, children, error }: FieldProps): ReactNode {
  return (
    <label className="ui-field">
      <span>{label}</span>
      {children}
      {error && (
        <span role="alert" className="ui-error">
          {error}
        </span>
      )}
    </label>
  );
}
export interface NoticeProps {
  children: ReactNode;
  tone?: "info" | "danger" | "success";
}
export function Alert({ children, tone = "info" }: NoticeProps): ReactNode {
  return (
    <div
      className={`ui-alert ui-alert-${tone}`}
      role={tone === "danger" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
export function Status({ children }: NoticeProps): ReactNode {
  return <span className="ui-status">{children}</span>;
}
export function Skeleton(): ReactNode {
  return <div role="status" aria-label={C.loading} className="ui-skeleton" />;
}
export interface DialogProps {
  title: string;
  children: ReactNode;
  trigger: ReactNode;
  sheet?: boolean;
}
export function Dialog({
  title,
  children,
  trigger,
  sheet = false,
}: DialogProps): ReactNode {
  return (
    <D.Root>
      <D.Trigger asChild>{trigger}</D.Trigger>
      <D.Portal>
        <D.Overlay className="ui-overlay" />
        <D.Content
          aria-describedby={undefined}
          className={sheet ? "ui-sheet" : "ui-dialog"}
        >
          <D.Title>{title}</D.Title>
          {children}
          <D.Close asChild>
            <Button variant="ghost">{C.close}</Button>
          </D.Close>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
export function Sheet(props: DialogProps): ReactNode {
  return <Dialog {...props} sheet />;
}
export const Drawer = Sheet;
export interface ConfirmationProps {
  title: string;
  description: string;
  onConfirm: () => void;
  trigger: ReactNode;
}
export function ConfirmationDialog({
  title,
  description,
  onConfirm,
  trigger,
}: ConfirmationProps): ReactNode {
  return (
    <A.Root>
      <A.Trigger asChild>{trigger}</A.Trigger>
      <A.Portal>
        <A.Overlay className="ui-overlay" />
        <A.Content className="ui-dialog">
          <A.Title>{title}</A.Title>
          <A.Description>{description}</A.Description>
          <div className="ui-row">
            <A.Cancel asChild>
              <Button variant="secondary">{C.cancel}</Button>
            </A.Cancel>
            <A.Action asChild>
              <Button onClick={onConfirm}>{C.confirm}</Button>
            </A.Action>
          </div>
        </A.Content>
      </A.Portal>
    </A.Root>
  );
}
export interface TabsProps {
  items: { id: string; label: string; content: ReactNode }[];
}
export function Tabs({ items }: TabsProps): ReactNode {
  return (
    <T.Root defaultValue={items[0]?.id}>
      <T.List className="ui-row">
        {items.map((i) => (
          <T.Trigger
            className="ui-button ui-button-secondary"
            key={i.id}
            value={i.id}
          >
            {i.label}
          </T.Trigger>
        ))}
      </T.List>
      {items.map((i) => (
        <T.Content key={i.id} value={i.id}>
          {i.content}
        </T.Content>
      ))}
    </T.Root>
  );
}
export interface TooltipProps {
  label: string;
  children: ReactNode;
}
export function Tooltip({ label, children }: TooltipProps): ReactNode {
  return (
    <Tip.Provider>
      <Tip.Root>
        <Tip.Trigger asChild>{children}</Tip.Trigger>
        <Tip.Portal>
          <Tip.Content className="ui-popover">{label}</Tip.Content>
        </Tip.Portal>
      </Tip.Root>
    </Tip.Provider>
  );
}
export interface DropdownProps {
  trigger: ReactNode;
  items: { label: string; onSelect: () => void }[];
}
export function DropdownMenu({ trigger, items }: DropdownProps): ReactNode {
  return (
    <Menu.Root>
      <Menu.Trigger asChild>{trigger}</Menu.Trigger>
      <Menu.Portal>
        <Menu.Content className="ui-popover">
          {items.map((i) => (
            <Menu.Item
              className="ui-menu-item"
              key={i.label}
              onSelect={i.onSelect}
            >
              {i.label}
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
export interface SelectProps {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string }[];
}
export function Select({
  label,
  value,
  onValueChange,
  options,
}: SelectProps): ReactNode {
  return (
    <S.Root value={value} onValueChange={onValueChange}>
      <S.Trigger className="ui-input" aria-label={label}>
        <S.Value placeholder={C.select} />
      </S.Trigger>
      <S.Portal>
        <S.Content className="ui-popover">
          <S.Viewport>
            {options.map((o) => (
              <S.Item className="ui-menu-item" value={o.value} key={o.value}>
                <S.ItemText>{o.label}</S.ItemText>
              </S.Item>
            ))}
          </S.Viewport>
        </S.Content>
      </S.Portal>
    </S.Root>
  );
}
export function Combobox(props: SelectProps): ReactNode {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button variant="secondary">
          {props.options.find((o) => o.value === props.value)?.label ??
            props.label}
        </Button>
      </Popover.Trigger>
      <Popover.Content className="ui-popover">
        <Command label={props.label}>
          <Command.Input placeholder={C.search} />
          <Command.List>
            <Command.Empty>{C.empty}</Command.Empty>
            {props.options.map((o) => (
              <Command.Item
                key={o.value}
                onSelect={() => props.onValueChange(o.value)}
              >
                {o.label}
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </Popover.Content>
    </Popover.Root>
  );
}
export interface DatePickerProps {
  value: Date | undefined;
  onChange: (v: Date | undefined) => void;
}
export function DatePicker({ value, onChange }: DatePickerProps): ReactNode {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button variant="secondary">
          {value?.toLocaleDateString() ?? C.date}
        </Button>
      </Popover.Trigger>
      <Popover.Content className="ui-popover">
        <DayPicker mode="single" selected={value} onSelect={onChange} />
      </Popover.Content>
    </Popover.Root>
  );
}
export interface PaginationProps {
  page: number;
  pages: number;
  onChange: (p: number) => void;
}
export function Pagination({
  page,
  pages,
  onChange,
}: PaginationProps): ReactNode {
  return (
    <nav aria-label="Pagination" className="ui-row">
      <Button
        variant="secondary"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        {C.previous}
      </Button>
      <span>
        {page} / {Math.max(1, pages)}
      </span>
      <Button
        variant="secondary"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        {C.next}
      </Button>
    </nav>
  );
}
export interface DataTableProps<T> {
  caption: string;
  items: T[];
  keyOf: (item: T) => string;
  columns: { key: string; label: string; render: (item: T) => ReactNode }[];
}
export function DataTable<T>({
  caption,
  items,
  keyOf,
  columns,
}: DataTableProps<T>): ReactNode {
  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th scope="col" key={c.key}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={keyOf(i)}>
              {columns.map((c) => (
                <td key={c.key}>{c.render(i)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!items.length && <p>{C.empty}</p>}
    </div>
  );
}
export interface BreadcrumbsProps {
  items: { label: string; href: string }[];
}
export function Breadcrumbs({ items }: BreadcrumbsProps): ReactNode {
  return (
    <nav aria-label="Breadcrumb" className="ui-row">
      {items.map((i) => (
        <a key={i.href} href={i.href}>
          {i.label}
        </a>
      ))}
    </nav>
  );
}
export interface FileUploadProps {
  onFile: (file: File) => void;
  accept?: string;
}
export function FileUpload({ onFile, accept }: FileUploadProps): ReactNode {
  const id = useId();
  return (
    <label htmlFor={id} className="ui-field">
      {C.upload}
      <Input
        id={id}
        type="file"
        accept={accept}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </label>
  );
}

export {renderLogisticsPrintPreview,type LogisticsPrintDocument} from "./logistics-print";
export {WorkspaceDashboard} from './workspace';
export type {WorkspaceDashboardProps,WorkspaceMetric,WorkspaceActivity,WorkspaceLink} from './workspace';
