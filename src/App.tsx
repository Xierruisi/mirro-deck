import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { listen } from "@tauri-apps/api/event";
import { save } from "@tauri-apps/plugin-dialog";
import { ChevronLeft, CircleAlert, Info, Link2, LoaderCircle, Play, RotateCcw, Square, X } from "lucide-react";

import { api } from "@/api";
import { AppSidebar } from "@/components/app-sidebar";
import { AppSettings, useSettingsSectionHeaders, type SettingsSection } from "@/components/app-settings";
import { ConnectionDialog, type ConnectionDialogStep } from "@/components/connection-dialog";
import { SettingsDashboard } from "@/components/settings-dashboard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { WindowTitlebar } from "@/components/window-titlebar";
import { defaultOptions } from "@/config";
import {
  connectionGuidance,
  connectionLabel,
  errorMessage,
  findNewAvailableWirelessDevice,
  loadScrcpyOptions,
  loadThemePreference,
  operationResultMessage,
  persistScrcpyOptions,
  persistThemePreference,
  type ThemePreference,
} from "@/app-logic";
import { useI18n } from "@/i18n";
import type { Device, ScrcpyOptions, SessionEvent, SessionInfo, ToolchainInfo } from "@/types";

function App() {
  const { t } = useI18n();
  const settingsSectionHeaders = useSettingsSectionHeaders();
  const [toolchain, setToolchain] = useState<ToolchainInfo>();
  const [devices, setDevices] = useState<Device[]>([]);
  const [lanDevices, setLanDevices] = useState<Device[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [selectedSerial, setSelectedSerial] = useState<string>();
  const [options, setOptions] = useState<ScrcpyOptions>(() =>
    loadScrcpyOptions((key) => window.localStorage.getItem(key), defaultOptions),
  );
  const [logs, setLogs] = useState<SessionEvent[]>([]);
  const [scanError, setScanError] = useState<string>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [connectionDialog, setConnectionDialog] = useState<ConnectionDialogStep>();
  const [address, setAddress] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [operationMessage, setOperationMessage] = useState<string>();
  const [operationBusy, setOperationBusy] = useState(false);
  const [view, setView] = useState<"device" | "settings">("device");
  const [theme, setTheme] = useState<ThemePreference>(() =>
    loadThemePreference((key) => window.localStorage.getItem(key)),
  );
  const [settingsSection, setSettingsSection] = useState<SettingsSection | null>(null);
  const [appVersion, setAppVersion] = useState("0.1.2");
  const deviceRefreshQueueRef = useRef<Promise<Device[] | undefined>>(Promise.resolve(undefined));
  const spinnerRefreshesRef = useRef(0);

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    void getVersion().then(setAppVersion).catch(() => undefined);
  }, []);

  const allDevices = useMemo(() => {
    const connectedSerials = new Set(devices.map((device) => device.serial));
    return [...devices, ...lanDevices.filter((device) => !connectedSerials.has(device.serial))];
  }, [devices, lanDevices]);
  const selectedDevice = useMemo(
    () => allDevices.find((device) => device.serial === selectedSerial),
    [allDevices, selectedSerial],
  );
  const selectedSession = useMemo(
    () => sessions.find((session) => session.deviceSerial === selectedSerial),
    [sessions, selectedSerial],
  );

  const refreshSessions = useCallback(async () => {
    try {
      setSessions(await api.sessions());
    } catch {
      // A refresh can race with app shutdown; session events remain authoritative.
    }
  }, []);

  const refreshDevices = useCallback((showSpinner = false) => {
    if (showSpinner) {
      spinnerRefreshesRef.current += 1;
      setIsRefreshing(true);
    }

    const queuedRefresh = deviceRefreshQueueRef.current.then(async (): Promise<Device[] | undefined> => {
      if (!showSpinner && document.hidden) return undefined;
      try {
        const nextDevices = await api.devices();
        setDevices(nextDevices);
        setScanError(undefined);
        setSelectedSerial((current) => {
          if (
            current &&
            (nextDevices.some((device) => device.serial === current) ||
              lanDevices.some((device) => device.serial === current))
          ) {
            return current;
          }
          return nextDevices.find((device) => device.state === "device")?.serial ?? nextDevices[0]?.serial;
        });
        return nextDevices;
      } catch (error) {
        setScanError(errorMessage(error, t));
        return undefined;
      }
    });

    deviceRefreshQueueRef.current = queuedRefresh.catch(() => undefined);
    return queuedRefresh.finally(() => {
      if (!showSpinner) return;
      spinnerRefreshesRef.current = Math.max(0, spinnerRefreshesRef.current - 1);
      if (spinnerRefreshesRef.current === 0) setIsRefreshing(false);
    });
  }, [lanDevices, t]);

  const scanLanDevices = useCallback(async () => {
    try {
      setLanDevices(await api.lanDevices());
    } catch (error) {
      setScanError(errorMessage(error, t));
    }
  }, [t]);

  const refreshAllDevices = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshDevices();
      await scanLanDevices();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshDevices, scanLanDevices]);

  useEffect(() => {
    void api.toolchain().then(setToolchain).catch(() => {
      setToolchain({ available: false, platform: "unknown", error: { key: "common.unknownError" } });
    });
    void refreshSessions();

    let disposed = false;
    let timer: number | undefined;
    let pollingGeneration = 0;

    const clearScheduledRefresh = () => {
      if (timer === undefined) return;
      window.clearTimeout(timer);
      timer = undefined;
    };

    const pollDevices = async (generation: number) => {
      if (disposed || generation !== pollingGeneration || document.hidden) return;
      await refreshDevices();
      if (disposed || generation !== pollingGeneration || document.hidden) return;
      timer = window.setTimeout(() => {
        timer = undefined;
        void pollDevices(generation);
      }, 1800);
    };

    const restartPolling = () => {
      pollingGeneration += 1;
      clearScheduledRefresh();
      if (!document.hidden) void pollDevices(pollingGeneration);
    };

    document.addEventListener("visibilitychange", restartPolling);
    restartPolling();

    return () => {
      disposed = true;
      pollingGeneration += 1;
      clearScheduledRefresh();
      document.removeEventListener("visibilitychange", restartPolling);
    };
  }, [refreshDevices, refreshSessions, t]);

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void listen<SessionEvent>("session-event", (event) => {
      if (disposed) return;
      setLogs((current) => [...current.slice(-299), event.payload]);
      if (["started", "exited", "error"].includes(event.payload.eventType)) void refreshSessions();
    }).then((cleanup) => {
      if (disposed) cleanup();
      else unlisten = cleanup;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [refreshSessions]);

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void listen("tray-add-device", () => {
      if (disposed) return;
      setView("device");
      setSettingsSection(null);
      setOperationMessage(undefined);
      setConnectionDialog("choose");
    }).then((cleanup) => {
      if (disposed) cleanup();
      else unlisten = cleanup;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    persistScrcpyOptions(
      (key, value) => window.localStorage.setItem(key, value),
      options,
    );
  }, [options]);

  useLayoutEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const useDark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.classList.toggle("dark", useDark);
      document.documentElement.style.colorScheme = useDark ? "dark" : "light";
    };

    persistThemePreference(
      (key, value) => window.localStorage.setItem(key, value),
      theme,
    );
    applyTheme();
    if (theme === "system") media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [theme]);

  async function startSession() {
    if (!selectedDevice || selectedDevice.state !== "device") return;
    setIsStarting(true);
    setOperationMessage(undefined);
    try {
      await api.start({ ...options, serial: selectedDevice.serial });
      await refreshSessions();
    } catch (error) {
      setOperationMessage(errorMessage(error, t));
    } finally {
      setIsStarting(false);
    }
  }

  async function connectDiscoveredDevice() {
    if (!selectedDevice || selectedDevice.state !== "discovered") return;
    setOperationBusy(true);
    setOperationMessage(undefined);
    try {
      const result = await api.connect(selectedDevice.serial);
      setOperationMessage(operationResultMessage(result, t));
      if (result.success) await refreshDevices(true);
    } catch (error) {
      setOperationMessage(errorMessage(error, t));
    } finally {
      setOperationBusy(false);
    }
  }

  async function stopSession() {
    if (!selectedSession) return;
    try {
      await api.stop(selectedSession.id);
    } catch (error) {
      setOperationMessage(errorMessage(error, t));
    }
  }

  async function submitConnection() {
    if (connectionDialog !== "pair" && connectionDialog !== "connect") return;
    setOperationBusy(true);
    setOperationMessage(undefined);
    try {
      const isPairing = connectionDialog === "pair";
      const result = isPairing
        ? await api.pair(address.trim(), pairingCode.trim())
        : await api.connect(address.trim());
      if (result.success && isPairing) {
        const devicesBeforePairing = allDevices;
        setAddress("");
        setPairingCode("");
        setOperationMessage(t("dialog.pairSuccess"));
        setConnectionDialog("connect");
        for (let attempt = 0; attempt < 6; attempt += 1) {
          const nextDevices = await refreshDevices(attempt === 0);
          const connectedDevice = nextDevices
            ? findNewAvailableWirelessDevice(devicesBeforePairing, nextDevices)
            : undefined;
          if (connectedDevice) {
            setSelectedSerial(connectedDevice.serial);
            setConnectionDialog(undefined);
            break;
          }
          if (attempt < 5) {
            await new Promise((resolve) => window.setTimeout(resolve, 500));
          }
        }
      } else {
        setOperationMessage(operationResultMessage(result, t));
      }
      if (result.success && !isPairing) {
        setConnectionDialog(undefined);
        setAddress("");
        setPairingCode("");
      }
      if (result.success && !isPairing) {
        await refreshDevices(true);
      }
    } catch (error) {
      setOperationMessage(errorMessage(error, t));
    } finally {
      setOperationBusy(false);
    }
  }

  async function restartAdb() {
    setOperationBusy(true);
    try {
      const result = await api.restartAdb();
      setOperationMessage(operationResultMessage(result, t) || t("app.restartAdbSuccess"));
      await refreshDevices(true);
    } catch (error) {
      setOperationMessage(errorMessage(error, t));
    } finally {
      setOperationBusy(false);
    }
  }

  async function chooseRecordingPath() {
    const path = await save({
      title: t("app.saveRecording"),
      defaultPath: `scrcpy-${new Date().toISOString().slice(0, 10)}.mp4`,
      filters: [
        { name: t("app.mp4Video"), extensions: ["mp4"] },
        { name: t("app.matroskaVideo"), extensions: ["mkv"] },
      ],
    });
    if (path) setOptions((current) => ({ ...current, recordPath: path }));
  }

  function openConnectionDialog(type: ConnectionDialogStep) {
    setView("device");
    setOperationMessage(undefined);
    setAddress("");
    setPairingCode("");
    setConnectionDialog(type);
  }

  function changeConnectionDialog(type?: ConnectionDialogStep) {
    setOperationMessage(undefined);
    setAddress("");
    setPairingCode("");
    setConnectionDialog(type);
  }

  function openConnectionGuide() {
    setConnectionDialog(undefined);
    setOperationMessage(undefined);
    setView("settings");
    setSettingsSection("connection");
  }

  const guidance = connectionGuidance(selectedDevice, scanError, t);
  const notice = operationMessage
    ? { tone: "info" as const, title: t("app.operationResult"), message: operationMessage }
    : guidance;
  const settingsHeader = settingsSection ? settingsSectionHeaders[settingsSection] : undefined;
  const SettingsHeaderIcon = settingsHeader?.icon;

  return (
    <div className="app-window flex h-screen min-h-[640px] min-w-[960px] flex-col overflow-hidden bg-background text-foreground">
      <WindowTitlebar />

      <div className="relative min-h-0 flex-1 overflow-hidden bg-sidebar">
        <SidebarProvider className="relative h-full min-h-0">
          <AppSidebar
            devices={allDevices}
            sessions={sessions}
            selectedSerial={selectedSerial}
            isRefreshing={isRefreshing}
            settingsOpen={view === "settings"}
            onDeviceSelect={(serial) => {
              setSelectedSerial(serial);
              setView("device");
              setSettingsSection(null);
            }}
            onRefresh={() => void refreshAllDevices()}
            onAddDevice={() => openConnectionDialog("choose")}
            onSettingsOpen={() => {
              setView("settings");
              setSettingsSection(null);
            }}
          />

          <SidebarInset className="min-h-0 min-w-0 overflow-hidden border border-border/70">
            <header className="flex h-[76px] shrink-0 items-center gap-3 border-b border-border bg-background/92 px-4 shadow-[0_8px_24px_rgb(39_54_115_/_0.04)] backdrop-blur-xl lg:px-6" data-tauri-drag-region>
              {view === "settings" ? (
                settingsHeader && SettingsHeaderIcon ? (
                  <>
                    <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground" aria-label={t("app.backToSettings")} onClick={() => setSettingsSection(null)}>
                      <ChevronLeft />
                    </Button>
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary [&_svg]:size-5">
                      <SettingsHeaderIcon />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="mb-1 text-[10px] font-semibold tracking-[0.14em] text-primary uppercase">{settingsHeader.eyebrow}</p>
                      <div className="flex min-w-0 items-baseline gap-2.5">
                        <h1 className="shrink-0 text-lg font-semibold tracking-tight">{settingsHeader.title}</h1>
                        <p className="truncate text-[10px] text-muted-foreground">{settingsHeader.description}</p>
                      </div>
                    </div>
                    {settingsSection === "updates" && <Badge variant="secondary">v{appVersion}</Badge>}
                  </>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="mb-1.5 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{t("app.preferences")}</p>
                      <h1 className="truncate text-xl font-semibold tracking-tight">{t("app.settings")}</h1>
                    </div>
                    <Badge variant="secondary">MirroDeck</Badge>
                  </>
                )
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-center gap-2">
                      <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{t("app.currentDevice")}</p>
                      {selectedDevice && (
                        <Badge className="h-4 border-primary/15 bg-primary/8 px-1.5 py-0 text-[8px] text-primary" variant="outline">
                          {connectionLabel(selectedDevice.connection, t)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex min-w-0 items-baseline gap-2.5">
                      <h1 className="truncate text-xl font-semibold tracking-tight">{selectedDevice?.model || selectedDevice?.serial || t("app.waitingForDevice")}</h1>
                      {selectedDevice?.model && <span className="truncate font-mono text-[9px] text-muted-foreground">{selectedDevice.serial}</span>}
                    </div>
                  </div>
                  {selectedSession ? (
                    <Button variant="outline" className="border-destructive/25 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => void stopSession()}>
                      <Square className="fill-current" />{t("app.stopMirroring")}
                    </Button>
                  ) : selectedDevice?.state === "discovered" ? (
                    <Button className="min-w-32" disabled={operationBusy} onClick={() => void connectDiscoveredDevice()}>
                      {operationBusy ? <LoaderCircle className="animate-spin" /> : <Link2 />}
                      {operationBusy ? t("dialog.processing") : t("dialog.connectDevice")}
                    </Button>
                  ) : (
                    <Button
                      className="min-w-32"
                      disabled={!selectedDevice || selectedDevice.state !== "device" || !toolchain?.available || isStarting}
                      onClick={() => void startSession()}
                    >
                      {isStarting ? <LoaderCircle className="animate-spin" /> : <Play className="fill-current" />}
                      {isStarting ? t("app.starting") : t("app.startMirroring")}
                    </Button>
                  )}
                </>
              )}
            </header>

            <div className="main-scrollbar min-h-0 flex-1 overflow-y-auto">
              {view === "settings" ? (
                <AppSettings
                  theme={theme}
                  onThemeChange={setTheme}
                  activeSection={settingsSection}
                  onSectionChange={setSettingsSection}
                  version={appVersion}
                />
              ) : (
                <>
                  {notice && (
                    <div className="px-6 pt-5">
                      <Alert variant={notice.tone === "error" ? "destructive" : notice.tone}>
                        {notice.tone === "info" ? <Info /> : <CircleAlert />}
                        <AlertTitle>{notice.title}</AlertTitle>
                        <AlertDescription>{notice.message}</AlertDescription>
                        <div className="col-start-3 row-span-2 row-start-1 flex items-center gap-1 self-center">
                          {(selectedDevice?.state === "offline" || scanError) && (
                            <Button size="sm" variant="outline" disabled={operationBusy} onClick={() => void restartAdb()}>
                              <RotateCcw className={operationBusy ? "animate-spin" : ""} />{t("app.restartAdb")}
                            </Button>
                          )}
                          {operationMessage && (
                            <Button variant="ghost" size="icon-sm" className="text-muted-foreground" onClick={() => setOperationMessage(undefined)} aria-label={t("app.dismissNotice")}>
                              <X />
                            </Button>
                          )}
                        </div>
                      </Alert>
                    </div>
                  )}

                  <SettingsDashboard
                    options={options}
                    setOptions={setOptions}
                    logs={logs}
                    onChooseRecordingPath={() => void chooseRecordingPath()}
                    onClearLogs={() => setLogs([])}
                  />
                </>
              )}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>

      <ConnectionDialog
        type={connectionDialog}
        address={address}
        pairingCode={pairingCode}
        busy={operationBusy}
        message={operationMessage}
        onTypeChange={changeConnectionDialog}
        onAddressChange={setAddress}
        onPairingCodeChange={setPairingCode}
        onGuideOpen={openConnectionGuide}
        onSubmit={() => void submitConnection()}
      />
    </div>
  );
}

export default App;
