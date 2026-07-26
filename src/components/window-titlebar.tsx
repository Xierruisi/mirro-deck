import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Maximize2, Minus, PanelsTopLeft, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";

export function WindowTitlebar() {
  const { t } = useI18n();
  const isMacOS = navigator.platform.startsWith("Mac");
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (isMacOS || !("__TAURI_INTERNALS__" in window)) return;
    const appWindow = getCurrentWindow();
    let disposed = false;
    let unlisten: (() => void) | undefined;

    const syncMaximizedState = async () => {
      try {
        const maximized = await appWindow.isMaximized();
        if (!disposed) {
          setIsMaximized(maximized);
          document.documentElement.classList.toggle("window-maximized", maximized);
        }
      } catch {
        // Window APIs are unavailable in a browser preview.
      }
    };

    void syncMaximizedState();
    void appWindow.onResized(syncMaximizedState).then((cleanup) => {
      if (disposed) cleanup();
      else unlisten = cleanup;
    }).catch(() => undefined);

    return () => {
      disposed = true;
      unlisten?.();
      document.documentElement.classList.remove("window-maximized");
    };
  }, [isMacOS]);

  async function runWindowAction(action: "minimize" | "maximize" | "close") {
    try {
      const appWindow = getCurrentWindow();
      if (action === "minimize") await appWindow.minimize();
      if (action === "close") await appWindow.close();
      if (action === "maximize") {
        await appWindow.toggleMaximize();
        const maximized = await appWindow.isMaximized();
        setIsMaximized(maximized);
        document.documentElement.classList.toggle("window-maximized", maximized);
      }
    } catch {
      // Keep browser-only previews interactive.
    }
  }

  if (isMacOS) {
    return null;
  }

  return (
    <header
      className="relative z-40 flex h-10 shrink-0 select-none items-center border-b border-sidebar-border bg-sidebar/95"
      data-tauri-drag-region
      onDoubleClick={() => void runWindowAction("maximize")}
    >
      <div className="min-w-0 flex-1 self-stretch" data-tauri-drag-region />
      <div className="ml-auto flex h-full" onDoubleClick={(event) => event.stopPropagation()}>
        <Button className="h-full w-11 rounded-none text-sidebar-muted hover:bg-sidebar-accent" variant="ghost" size="icon" title={t("window.minimize")} aria-label={t("window.minimizeWindow")} onClick={() => void runWindowAction("minimize")}>
          <Minus className="size-3.5" />
        </Button>
        <Button className="h-full w-11 rounded-none text-sidebar-muted hover:bg-sidebar-accent" variant="ghost" size="icon" title={isMaximized ? t("window.restore") : t("window.maximize")} aria-label={isMaximized ? t("window.restoreWindow") : t("window.maximizeWindow")} onClick={() => void runWindowAction("maximize")}>
          {isMaximized ? <PanelsTopLeft className="size-3.5" /> : <Maximize2 className="size-3.5" />}
        </Button>
        <Button className="h-full w-11 rounded-none text-sidebar-muted hover:bg-destructive hover:text-white" variant="ghost" size="icon" title={t("window.close")} aria-label={t("window.closeWindow")} onClick={() => void runWindowAction("close")}>
          <X className="size-3.5" />
        </Button>
      </div>
    </header>
  );
}
