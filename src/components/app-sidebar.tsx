import type { ComponentProps } from "react";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Settings2,
  Smartphone,
  Usb,
} from "lucide-react";

import mirrodeckMark from "@/assets/brand/mirrodeck-mark.svg";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { useI18n, type Translate } from "@/i18n";
import { cn } from "@/lib/utils";
import type { Device, SessionInfo } from "@/types";

type AppSidebarProps = ComponentProps<typeof Sidebar> & {
  devices: Device[];
  sessions: SessionInfo[];
  selectedSerial?: string;
  isRefreshing: boolean;
  onDeviceSelect: (serial: string) => void;
  onRefresh: () => void;
  onAddDevice: () => void;
  settingsOpen: boolean;
  onSettingsOpen: () => void;
};

const statusStyles: Record<string, string> = {
  device: "bg-emerald-400",
  unauthorized: "bg-amber-400",
  offline: "bg-brand-coral",
  discovered: "bg-sky-400",
};

export function AppSidebar({
  devices,
  sessions,
  selectedSerial,
  isRefreshing,
  onDeviceSelect,
  onRefresh,
  onAddDevice,
  settingsOpen,
  onSettingsOpen,
  className,
  ...props
}: AppSidebarProps) {
  const { state, toggleSidebar } = useSidebar();
  const { t } = useI18n();
  const sidebarToggleLabel = state === "expanded" ? t("sidebar.collapse") : t("sidebar.expand");

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      className={cn("absolute! inset-y-0! h-full!", className)}
      {...props}
    >
      <SidebarHeader className="pt-3">
        <div
          className="macos-sidebar-drag-region"
          data-tauri-drag-region
          aria-hidden="true"
        />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="MirroDeck"
              className="h-14 rounded-xl hover:bg-sidebar-accent/70 data-[active=true]:bg-sidebar-accent"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-sidebar-border bg-sidebar-elevated shadow-sm group-data-[collapsible=icon]:size-8">
                <img
                  className="size-7 group-data-[collapsible=icon]:size-6"
                  src={mirrodeckMark}
                  alt=""
                  aria-hidden="true"
                />
              </span>
              <span className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-semibold tracking-tight">
                  MirroDeck
                </span>
                <span className="mt-1 truncate text-[10px] font-normal text-sidebar-muted">
                  {t("sidebar.tagline")}
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="surface-scrollbar">
        <SidebarGroup className="min-h-0 flex-1">
          <SidebarGroupLabel className="h-9 pr-10 text-[10px] font-semibold tracking-[0.14em] text-sidebar-muted/75 uppercase">
            {t("sidebar.devices")}
            <span className="ml-2 text-[10px] font-medium tracking-normal text-sidebar-foreground/60 normal-case">
              {t("sidebar.deviceCount", { count: devices.length })}
            </span>
          </SidebarGroupLabel>
          <SidebarGroupAction
            className="top-4 right-3 size-6 text-sidebar-muted hover:bg-sidebar-elevated hover:text-primary"
            onClick={onRefresh}
            title={t("sidebar.refreshDevices")}
            aria-label={t("sidebar.refreshDevices")}
          >
            <RefreshCw className={cn(isRefreshing && "animate-spin")} />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {devices.map((device) => {
                const selected = selectedSerial === device.serial;
                const live = sessions.some(
                  (session) => session.deviceSerial === device.serial,
                );
                const displayName = device.model || device.serial;

                return (
                  <SidebarMenuItem key={device.serial}>
                    <SidebarMenuButton
                      size="lg"
                      isActive={selected && !settingsOpen}
                      tooltip={`${displayName} · ${deviceStateLabel(device.state, t)}`}
                      className={cn(
                        "h-auto min-h-16 items-center rounded-xl border border-transparent px-2 py-2 text-sidebar-muted hover:border-sidebar-border hover:bg-sidebar-elevated/65 hover:text-sidebar-foreground group-data-[collapsible=icon]:min-h-8!",
                        selected &&
                          !settingsOpen &&
                          "border-primary/20 bg-sidebar-elevated text-sidebar-foreground shadow-[inset_2px_0_0_var(--color-primary),0_8px_22px_rgb(39_54_115_/_0.08)] hover:bg-sidebar-elevated",
                      )}
                      onClick={() => onDeviceSelect(device.serial)}
                    >
                      <span
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-lg bg-sidebar-elevated text-sidebar-muted shadow-xs group-data-[collapsible=icon]:size-4 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:shadow-none",
                          device.state === "device" &&
                            "bg-primary/10 text-primary",
                          device.state === "unauthorized" &&
                            "bg-amber-400/12 text-amber-600",
                        )}
                      >
                        <Smartphone className="size-4.5 group-data-[collapsible=icon]:size-4" />
                      </span>
                      <span className="grid min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden">
                        <span className="truncate text-xs font-medium">
                          {displayName}
                        </span>
                        <span className="mt-1 truncate font-mono text-[9px] font-normal text-sidebar-muted/65">
                          {device.serial}
                        </span>
                        <span className="mt-1 flex items-center text-[9px] font-normal text-sidebar-muted/85">
                          <i
                            className={cn(
                              "mr-1.5 size-1.5 rounded-full bg-sidebar-muted/30",
                              statusStyles[device.state],
                            )}
                          />
                          {deviceStateLabel(device.state, t)} ·{" "}
                          {connectionLabel(device.connection, t)}
                        </span>
                      </span>
                    </SidebarMenuButton>
                    {live && (
                      <SidebarMenuBadge className="top-2! right-2 border border-primary/20 bg-primary/[0.08] text-[8px] tracking-wider text-primary">
                        {t("sidebar.live")}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}

              {devices.length === 0 && (
                <li className="flex flex-col items-center px-3 py-10 text-center text-sidebar-muted/70 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-2">
                  <span className="mb-3 grid size-10 place-items-center rounded-xl border border-dashed border-primary/20 bg-sidebar-elevated text-primary group-data-[collapsible=icon]:mb-0 group-data-[collapsible=icon]:size-8">
                    <Usb className="size-4" />
                  </span>
                  <span className="text-xs font-medium text-sidebar-foreground/65 group-data-[collapsible=icon]:hidden">
                    {t("sidebar.noDevices")}
                  </span>
                  <span className="mt-1.5 text-[10px] leading-relaxed group-data-[collapsible=icon]:hidden">
                    {t("sidebar.noDevicesHint")}
                  </span>
                </li>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={t("sidebar.addDevice")}
              aria-label={t("sidebar.addDevice")}
              onClick={onAddDevice}
              className="h-auto min-h-12 rounded-xl border border-sidebar-border/70 bg-sidebar-elevated/55 hover:bg-sidebar-elevated group-data-[collapsible=icon]:min-h-8! group-data-[collapsible=icon]:rounded-lg"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary group-data-[collapsible=icon]:size-4 group-data-[collapsible=icon]:bg-transparent">
                <Plus className="size-4" />
              </span>
              <span className="grid min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                <span className="truncate text-[10px] font-medium text-sidebar-foreground/80">
                  {t("sidebar.addDevice")}
                </span>
                <span className="mt-0.5 truncate text-[9px] font-normal text-sidebar-muted/70">
                  {t("sidebar.addDeviceHint")}
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarSeparator className="my-1" />

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={settingsOpen}
              tooltip={t("sidebar.settings")}
              onClick={onSettingsOpen}
              className="text-[11px]!"
            >
              <Settings2 />
              <span className="group-data-[collapsible=icon]:hidden">{t("sidebar.settings")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={sidebarToggleLabel}
              aria-label={sidebarToggleLabel}
              onClick={toggleSidebar}
              className="text-[11px]!"
            >
              {state === "expanded" ? <PanelLeftClose /> : <PanelLeftOpen />}
              <span className="group-data-[collapsible=icon]:hidden">
                {sidebarToggleLabel}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function deviceStateLabel(state: string, t: Translate) {
  return (
    {
      device: t("device.state.available"),
      unauthorized: t("device.state.unauthorized"),
      offline: t("device.state.offline"),
      discovered: t("device.state.discovered"),
    }[state] || state
  );
}

function connectionLabel(connection: string, t: Translate) {
  return (
    {
      usb: t("device.connection.usb"),
      tcpip: t("device.connection.wifi"),
      emulator: t("device.connection.emulator"),
    }[connection] || connection
  );
}
