import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import {
  BookOpenText,
  Cable,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Code2,
  Download,
  ExternalLink,
  FileWarning,
  Info,
  Laptop,
  Languages,
  LoaderCircle,
  Moon,
  MonitorSmartphone,
  Palette,
  RefreshCw,
  ShieldCheck,
  Sun,
  Wifi,
} from "lucide-react";

import mirrodeckMark from "@/assets/brand/mirrodeck-mark.svg";
import type { ThemePreference } from "@/app-logic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { projectLinks } from "@/config";
import {
  supportedLanguages,
  useI18n,
  type LanguagePreference,
} from "@/i18n";
import { cn } from "@/lib/utils";
import {
  createUpdateProgressTracker,
  updateErrorMessage,
  type UpdateStatus,
} from "@/update-logic";

export type { ThemePreference } from "@/app-logic";

interface AppSettingsProps {
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  activeSection: SettingsSection | null;
  onSectionChange: (section: SettingsSection | null) => void;
  version: string;
}

export type SettingsSection = "connection" | "resources" | "theme" | "language" | "updates" | "disclaimer" | "about";

type SettingsSectionHeader = {
  eyebrow: string;
  title: string;
  description: string;
  icon: typeof Sun;
};

export function useSettingsSectionHeaders(): Record<SettingsSection, SettingsSectionHeader> {
  const { t } = useI18n();
  return {
    connection: { eyebrow: t("settings.header.connection.eyebrow"), title: t("settings.header.connection.title"), description: t("settings.header.connection.description"), icon: BookOpenText },
    resources: { eyebrow: t("settings.header.resources.eyebrow"), title: t("settings.header.resources.title"), description: t("settings.header.resources.description"), icon: Code2 },
    theme: { eyebrow: t("settings.header.theme.eyebrow"), title: t("settings.header.theme.title"), description: t("settings.header.theme.description"), icon: Palette },
    language: { eyebrow: t("settings.header.language.eyebrow"), title: t("settings.header.language.title"), description: t("settings.header.language.description"), icon: Languages },
    updates: { eyebrow: t("settings.header.updates.eyebrow"), title: t("settings.header.updates.title"), description: t("settings.header.updates.description"), icon: RefreshCw },
    disclaimer: { eyebrow: t("settings.header.disclaimer.eyebrow"), title: t("settings.header.disclaimer.title"), description: t("settings.header.disclaimer.description"), icon: FileWarning },
    about: { eyebrow: t("settings.header.about.eyebrow"), title: t("settings.header.about.title"), description: t("settings.header.about.description"), icon: Info },
  };
}

export function AppSettings({ theme, onThemeChange, activeSection, onSectionChange, version }: AppSettingsProps) {
  const { t } = useI18n();
  const settingsSectionHeaders = useSettingsSectionHeaders();
  const settingsNavigation: Array<{
    label: string;
    items: Array<{ id: SettingsSection; label: string; description: string; icon: typeof Sun }>;
  }> = [
    {
      label: t("settings.nav.more"),
      items: [
        { id: "connection", label: settingsSectionHeaders.connection.title, description: t("settings.nav.connection.description"), icon: BookOpenText },
        { id: "resources", label: settingsSectionHeaders.resources.title, description: t("settings.nav.resources.description"), icon: Code2 },
      ],
    },
    {
      label: t("settings.nav.settings"),
      items: [
        { id: "theme", label: settingsSectionHeaders.theme.title, description: t("settings.nav.theme.description"), icon: Palette },
        { id: "language", label: settingsSectionHeaders.language.title, description: t("settings.nav.language.description"), icon: Languages },
        { id: "updates", label: settingsSectionHeaders.updates.title, description: t("settings.nav.updates.description"), icon: RefreshCw },
      ],
    },
    {
      label: t("settings.nav.other"),
      items: [
        { id: "disclaimer", label: settingsSectionHeaders.disclaimer.title, description: t("settings.nav.disclaimer.description"), icon: FileWarning },
        { id: "about", label: settingsSectionHeaders.about.title, description: t("settings.nav.about.description"), icon: Info },
      ],
    },
  ];
  const [pendingUpdate, setPendingUpdate] = useState<Update | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    phase: "idle",
    messageKey: "settings.updates.idle",
  });

  async function checkForUpdates() {
    if (!("__TAURI_INTERNALS__" in window)) {
      setUpdateStatus({ phase: "error", messageKey: "settings.updates.desktopOnly" });
      return;
    }

    setPendingUpdate(null);
    setUpdateStatus({ phase: "checking", messageKey: "settings.updates.connecting" });
    try {
      const update = await check({ timeout: 20_000 });
      if (!update) {
        setUpdateStatus({ phase: "current", messageKey: "settings.updates.current", messageValues: { version } });
        return;
      }
      setPendingUpdate(update);
      setUpdateStatus({ phase: "available", messageKey: "settings.updates.available", messageValues: { version: update.version } });
    } catch (error) {
      setUpdateStatus({ phase: "error", ...updateErrorMessage(error, t("settings.updates.error.unknown")) });
    }
  }

  async function installUpdate() {
    if (!pendingUpdate) return;
    const trackProgress = createUpdateProgressTracker();
    setUpdateStatus({ phase: "installing", messageKey: "settings.updates.preparing", progress: 0 });

    try {
      await pendingUpdate.downloadAndInstall((event) => {
        setUpdateStatus(trackProgress(event));
      });
      setUpdateStatus({ phase: "restarting", messageKey: "settings.updates.restarting", progress: 100 });
      await relaunch();
    } catch (error) {
      setUpdateStatus({ phase: "error", ...updateErrorMessage(error, t("settings.updates.error.unknown")) });
    }
  }

  if (!activeSection) {
    return (
      <div className="mx-auto w-full max-w-3xl px-8 py-7">
        <nav aria-label={t("settings.categories")}>
          {settingsNavigation.map((group, groupIndex) => (
            <section className={cn(groupIndex > 0 && "mt-5")} key={group.label}>
              <h2 className="px-2 pb-2 text-[10px] font-medium tracking-[0.08em] text-muted-foreground">{group.label}</h2>
              <div className="divide-y divide-border/75">
                {group.items.map((item) => (
                  <SettingsNavigationItem key={item.id} item={item} onClick={() => onSectionChange(item.id)} />
                ))}
              </div>
            </section>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-7">
      {activeSection === "connection" && <ConnectionGuidePanel />}
      {activeSection === "resources" && <ResourcesPanel />}
      {activeSection === "theme" && <ThemePanel theme={theme} onThemeChange={onThemeChange} />}
      {activeSection === "language" && <LanguagePanel />}
      {activeSection === "updates" && (
        <UpdatePanel
          pendingUpdate={pendingUpdate}
          status={updateStatus}
          onCheck={() => void checkForUpdates()}
          onInstall={() => void installUpdate()}
        />
      )}
      {activeSection === "disclaimer" && <DisclaimerPanel />}
      {activeSection === "about" && <AboutPanel version={version} />}
    </div>
  );
}

function ConnectionGuidePanel() {
  const { t } = useI18n();

  return (
    <SettingsPanel>
      <div className="grid gap-5">
        <div className="rounded-xl border border-primary/15 bg-primary/[0.05] p-4">
          <p className="text-xs font-semibold text-foreground">{t("settings.connection.enableDeveloper.title")}</p>
          <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
            {t("settings.connection.enableDeveloper.description")}
          </p>
        </div>

        <GuideSection
          icon={Cable}
          title={t("settings.connection.usb.title")}
          description={t("settings.connection.usb.description")}
          steps={[
            t("settings.connection.usb.step1"),
            t("settings.connection.usb.step2"),
            t("settings.connection.usb.step3"),
          ]}
        />

        <GuideSection
          icon={Wifi}
          title={t("settings.connection.wifi.title")}
          description={t("settings.connection.wifi.description")}
          steps={[
            t("settings.connection.wifi.step1"),
            t("settings.connection.wifi.step2"),
            t("settings.connection.wifi.step3"),
            t("settings.connection.wifi.step4"),
            t("settings.connection.wifi.step5"),
          ]}
          note={t("settings.connection.wifi.note")}
        />

        <GuideSection
          icon={MonitorSmartphone}
          title={t("settings.connection.emulator.title")}
          description={t("settings.connection.emulator.description")}
          steps={[
            t("settings.connection.emulator.step1"),
            t("settings.connection.emulator.step2"),
            t("settings.connection.emulator.step3"),
          ]}
        />

        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <div className="flex items-center gap-2">
            <CircleAlert className="size-4 text-amber-500" />
            <h3 className="text-xs font-semibold">{t("settings.connection.troubleshooting.title")}</h3>
          </div>
          <dl className="mt-3 grid gap-2 text-[10px] leading-relaxed">
            <GuideStatus term={t("settings.connection.troubleshooting.unauthorized.term")} description={t("settings.connection.troubleshooting.unauthorized.description")} />
            <GuideStatus term={t("settings.connection.troubleshooting.offline.term")} description={t("settings.connection.troubleshooting.offline.description")} />
            <GuideStatus term={t("settings.connection.troubleshooting.notFound.term")} description={t("settings.connection.troubleshooting.notFound.description")} />
            <GuideStatus term={t("settings.connection.troubleshooting.notAfterPairing.term")} description={t("settings.connection.troubleshooting.notAfterPairing.description")} />
          </dl>
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/20 p-4 text-[10px] leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
          <p>{t("settings.connection.security")}</p>
        </div>
      </div>
    </SettingsPanel>
  );
}

function GuideSection({
  icon: Icon,
  title,
  description,
  steps,
  note,
}: {
  icon: typeof Sun;
  title: string;
  description: string;
  steps: string[];
  note?: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--surface-shadow)]">
      <div className="flex items-center gap-3 border-b border-border bg-muted/25 px-4 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div>
          <h3 className="text-xs font-semibold">{title}</h3>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{description}</p>
        </div>
      </div>
      <ol className="grid gap-3 px-4 py-4">
        {steps.map((step, index) => (
          <li className="flex items-start gap-3 text-[10px] leading-relaxed text-muted-foreground" key={step}>
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-secondary text-[9px] font-semibold text-primary">
              {index + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
      {note && (
        <p className="mx-4 mb-4 rounded-lg border border-amber-500/15 bg-amber-500/[0.06] px-3 py-2.5 text-[10px] leading-relaxed text-foreground">
          {note}
        </p>
      )}
    </section>
  );
}

function GuideStatus({ term, description }: { term: string; description: string }) {
  return (
    <div className="grid grid-cols-[5rem_1fr] gap-3 rounded-lg bg-card px-3 py-2">
      <dt className="font-semibold text-foreground">{term}</dt>
      <dd className="text-muted-foreground">{description}</dd>
    </div>
  );
}

function SettingsNavigationItem({
  item,
  onClick,
}: {
  item: { id: SettingsSection; label: string; description: string; icon: typeof Sun };
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      className="group flex min-h-[68px] w-full items-center gap-3 px-2 text-left outline-none transition-colors hover:bg-muted/55 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40"
      onClick={onClick}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary [&_svg]:size-4">
        <Icon />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-foreground">{item.label}</span>
        <span className="mt-1 block truncate text-[10px] text-muted-foreground">{item.description}</span>
      </span>
      <ChevronRight className="size-3.5 text-muted-foreground/55 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </button>
  );
}

function ThemePanel({ theme, onThemeChange }: { theme: ThemePreference; onThemeChange: (theme: ThemePreference) => void }) {
  const { t } = useI18n();
  const themes: Array<{ value: ThemePreference; label: string; description: string; icon: typeof Sun }> = [
    { value: "light", label: t("settings.theme.light.label"), description: t("settings.theme.light.description"), icon: Sun },
    { value: "dark", label: t("settings.theme.dark.label"), description: t("settings.theme.dark.description"), icon: Moon },
    { value: "system", label: t("settings.theme.system.label"), description: t("settings.theme.system.description"), icon: Laptop },
  ];

  return (
    <SettingsPanel>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-muted/20" role="group" aria-label={t("settings.theme.groupLabel")}>
        {themes.map((item) => {
          const Icon = item.icon;
          const active = theme === item.value;
          return (
            <button
              key={item.value}
              type="button"
              aria-pressed={active}
              className={cn("flex min-h-[74px] w-full items-center gap-3 px-4 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40", active && "bg-primary/[0.07]")}
              onClick={() => onThemeChange(item.value)}
            >
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg bg-card text-muted-foreground shadow-xs", active && "bg-primary text-primary-foreground")}>
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold">{item.label}</span>
                <span className="mt-1 block text-[10px] text-muted-foreground">{item.description}</span>
              </span>
              <CheckCircle2 className={cn("size-4 text-muted-foreground/25", active && "text-primary")} />
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">{t("settings.theme.systemHint")}</p>
    </SettingsPanel>
  );
}

function LanguagePanel() {
  const {
    languageName,
    preference,
    setPreference,
    systemLanguage,
    t,
  } = useI18n();
  const choices: LanguagePreference[] = ["system", ...supportedLanguages];

  return (
    <SettingsPanel>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-muted/20" role="group" aria-label={t("settings.language.groupLabel")}>
        {choices.map((choice) => {
          const active = preference === choice;
          const system = choice === "system";
          const label = system ? t("settings.language.system.label") : languageName(choice, true);
          const description = system
            ? t("settings.language.system.description", { language: languageName(systemLanguage) })
            : t("settings.language.explicit.description", { language: languageName(choice) });
          return (
            <button
              key={choice}
              type="button"
              aria-pressed={active}
              className={cn("flex min-h-[68px] w-full items-center gap-3 px-4 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40", active && "bg-primary/[0.07]")}
              onClick={() => setPreference(choice)}
            >
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg bg-card text-muted-foreground shadow-xs", active && "bg-primary text-primary-foreground")}>
                {system ? <Laptop className="size-4" /> : <Languages className="size-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold">{label}</span>
                <span className="mt-1 block text-[10px] text-muted-foreground">{description}</span>
              </span>
              <CheckCircle2 className={cn("size-4 text-muted-foreground/25", active && "text-primary")} />
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">{t("settings.language.systemHint")}</p>
    </SettingsPanel>
  );
}

function ResourcesPanel() {
  const { t } = useI18n();

  return (
    <SettingsPanel>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-muted/20">
        <ResourceLink title={t("settings.resources.source.title")} description={t("settings.resources.source.description")} url={projectLinks.repository} />
        <ResourceLink title="Genymobile / scrcpy" description={t("settings.resources.scrcpy.description")} url={projectLinks.scrcpy} />
        <ResourceLink title="Tauri" description={t("settings.resources.tauri.description")} url={projectLinks.tauri} />
      </div>
    </SettingsPanel>
  );
}

function ResourceLink({ title, description, url }: { title: string; description: string; url: string }) {
  return (
    <button type="button" className="group flex min-h-[74px] w-full items-center gap-3 px-4 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40" onClick={() => void openExternal(url)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-card text-primary shadow-xs"><Code2 className="size-4" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold">{title}</span>
        <span className="mt-1 block truncate text-[10px] text-muted-foreground">{description}</span>
      </span>
      <ExternalLink className="size-3.5 text-muted-foreground group-hover:text-primary" />
    </button>
  );
}

function UpdatePanel({
  pendingUpdate,
  status,
  onCheck,
  onInstall,
}: {
  pendingUpdate: Update | null;
  status: UpdateStatus;
  onCheck: () => void;
  onInstall: () => void;
}) {
  const { t } = useI18n();

  return (
    <SettingsPanel>
      <UpdateMessage status={status} />
      {pendingUpdate?.body && status.phase === "available" && (
        <div className="mt-4 rounded-xl border border-border bg-muted/20 p-4">
          <p className="mb-2 text-[10px] font-semibold text-foreground">{t("settings.updates.releaseNotes")}</p>
          <p className="line-clamp-6 whitespace-pre-line text-[10px] leading-relaxed text-muted-foreground">{pendingUpdate.body}</p>
        </div>
      )}
      {status.phase === "installing" && (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full bg-primary transition-[width]", status.progress === undefined && "w-1/3 animate-pulse")} style={status.progress === undefined ? undefined : { width: `${status.progress}%` }} />
        </div>
      )}
      <div className="mt-6 flex gap-2">
        {status.phase === "available" ? (
          <Button onClick={onInstall}><Download />{t("settings.updates.downloadInstall", { version: pendingUpdate?.version ?? "" })}</Button>
        ) : (
          <Button variant="outline" disabled={["checking", "installing", "restarting"].includes(status.phase)} onClick={onCheck}>
            {status.phase === "checking" ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
            {status.phase === "checking" ? t("settings.updates.checking") : t("settings.updates.check")}
          </Button>
        )}
        <Button variant="ghost" onClick={() => void openExternal(projectLinks.releases)}>{t("settings.updates.viewReleases")}<ExternalLink /></Button>
      </div>
    </SettingsPanel>
  );
}

function DisclaimerPanel() {
  const { t } = useI18n();

  return (
    <SettingsPanel>
      <div className="grid gap-4 rounded-xl border border-border bg-muted/20 p-5 text-xs leading-6 text-muted-foreground">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 size-4 shrink-0 text-amber-500" />
          <p>{t("settings.disclaimer.independent")}</p>
        </div>
        <p>{t("settings.disclaimer.asIs")}</p>
        <p>{t("settings.disclaimer.thirdParty")}</p>
      </div>
    </SettingsPanel>
  );
}

function AboutPanel({ version }: { version: string }) {
  const { t } = useI18n();

  return (
    <SettingsPanel>
      <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/20 p-5">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl border border-border bg-card shadow-[var(--surface-shadow)]">
          <img className="size-11" src={mirrodeckMark} alt="" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold tracking-tight">MirroDeck</h3>
          <p className="mt-1 text-xs text-muted-foreground">{t("settings.about.tagline")}</p>
          <div className="mt-3 flex gap-2">
            <Badge variant="secondary">{t("common.version", { version })}</Badge>
            <Badge variant="outline">Tauri 2</Badge>
            <Badge variant="outline">scrcpy 4.1</Badge>
          </div>
        </div>
      </div>
      <p className="mt-5 text-xs leading-6 text-muted-foreground">{t("settings.about.description")}</p>
      <Button className="mt-5" variant="outline" onClick={() => void openExternal(projectLinks.repository)}><Code2 />{t("settings.about.viewGithub")}<ExternalLink /></Button>
    </SettingsPanel>
  );
}

function SettingsPanel({
  children,
}: {
  children: React.ReactNode;
}) {
  return <section className="min-h-[500px] py-1">{children}</section>;
}

function UpdateMessage({ status }: { status: UpdateStatus }) {
  const { t } = useI18n();
  const success = status.phase === "current";
  const busy = ["checking", "installing", "restarting"].includes(status.phase);
  return (
    <div className={cn("flex items-start gap-2.5 rounded-xl border border-border bg-muted/35 p-4", status.phase === "error" && "border-destructive/20 bg-destructive/5")}>
      {busy ? (
        <LoaderCircle className="mt-0.5 size-3.5 shrink-0 animate-spin text-primary" />
      ) : success ? (
        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
      ) : (
        <Code2 className={cn("mt-0.5 size-3.5 shrink-0 text-muted-foreground", status.phase === "available" && "text-primary")} />
      )}
      <p className="text-[10px] leading-relaxed text-muted-foreground">{t(status.messageKey, status.messageValues)}</p>
    </div>
  );
}

async function openExternal(url: string) {
  if ("__TAURI_INTERNALS__" in window) await openUrl(url);
  else window.open(url, "_blank", "noopener,noreferrer");
}
