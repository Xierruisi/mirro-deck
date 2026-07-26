import type { Dispatch, ReactNode, SetStateAction } from "react";
import {
  Activity,
  AudioLines,
  Eye,
  FileVideo2,
  FolderOpen,
  Gauge,
  Keyboard,
  MonitorCog,
  MoonStar,
  Pin,
  ScanEye,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";

import { presets } from "@/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { translateLocalizedMessage, useI18n, type TranslationKey } from "@/i18n";
import { cn } from "@/lib/utils";
import type { ScrcpyOptions, SessionEvent } from "@/types";

interface SettingsDashboardProps {
  options: ScrcpyOptions;
  setOptions: Dispatch<SetStateAction<ScrcpyOptions>>;
  logs: SessionEvent[];
  onChooseRecordingPath: () => void;
  onClearLogs: () => void;
}

export function SettingsDashboard({ options, setOptions, logs, onChooseRecordingPath, onClearLogs }: SettingsDashboardProps) {
  const { language, t } = useI18n();

  function applyPreset(presetOptions: Partial<ScrcpyOptions>) {
    setOptions((current) => ({ ...current, ...presetOptions }));
  }

  function updateNumber(key: "maxSize" | "maxFps" | "videoBitrateMbps", value: string) {
    setOptions((current) => ({ ...current, [key]: value === "original" ? undefined : Number(value) }));
  }

  return (
    <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] gap-4 p-6">
      <Card>
        <SectionHeader eyebrow={t("dashboard.quickSettings.eyebrow")} title={t("dashboard.quickSettings.title")} description={t("dashboard.quickSettings.description")} />
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            {presets.map((preset) => {
              const active = presetMatches(options, preset.options);
              const presetName = t(`preset.${preset.id}.name` as TranslationKey);
              return (
                <Button
                  key={preset.id}
                  variant="outline"
                  className={cn(
                    "h-auto min-w-0 flex-col items-start gap-0 rounded-xl p-3 text-left hover:border-primary/35 hover:bg-primary/[0.05]",
                    active && "border-primary/45 bg-primary/[0.08] ring-1 ring-primary/10",
                  )}
                  onClick={() => applyPreset(preset.options)}
                >
                  <span className={cn("mb-3 grid size-7 place-items-center rounded-lg bg-secondary text-muted-foreground", active && "bg-primary/12 text-primary")}>
                    <PresetIcon id={preset.id} />
                  </span>
                  <span className="w-full truncate text-xs font-semibold">{presetName}</span>
                  <span className="mt-1 w-full truncate text-[9px] font-normal text-muted-foreground">{t(`preset.${preset.id}.description` as TranslationKey)}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="row-span-2">
        <SectionHeader eyebrow={t("dashboard.behavior.eyebrow")} title={t("dashboard.behavior.title")} description={t("dashboard.behavior.description")} />
        <CardContent className="pt-0">
          <SettingToggle id="audio" icon={<AudioLines />} label={t("dashboard.audio.label")} hint={t("dashboard.audio.hint")} checked={options.audio} onCheckedChange={(audio) => setOptions((current) => ({ ...current, audio }))} />
          <Separator />
          <SettingToggle id="control" icon={<Keyboard />} label={t("dashboard.control.label")} hint={t("dashboard.control.hint")} checked={options.control} onCheckedChange={(control) => setOptions((current) => ({ ...current, control }))} />
          <Separator />
          <SettingToggle id="screen-off" icon={<MoonStar />} label={t("dashboard.screenOff.label")} hint={t("dashboard.screenOff.hint")} checked={options.turnScreenOff} onCheckedChange={(turnScreenOff) => setOptions((current) => ({ ...current, turnScreenOff }))} />
          <Separator />
          <SettingToggle id="stay-awake" icon={<Zap />} label={t("dashboard.stayAwake.label")} hint={t("dashboard.stayAwake.hint")} checked={options.stayAwake} onCheckedChange={(stayAwake) => setOptions((current) => ({ ...current, stayAwake }))} />
          <Separator />
          <SettingToggle id="always-on-top" icon={<Pin />} label={t("dashboard.alwaysOnTop.label")} hint={t("dashboard.alwaysOnTop.hint")} checked={options.alwaysOnTop} onCheckedChange={(alwaysOnTop) => setOptions((current) => ({ ...current, alwaysOnTop }))} />
          <Separator />
          <SettingToggle id="fullscreen" icon={<MonitorCog />} label={t("dashboard.fullscreen.label")} hint={t("dashboard.fullscreen.hint")} checked={options.fullscreen} onCheckedChange={(fullscreen) => setOptions((current) => ({ ...current, fullscreen }))} />
        </CardContent>
      </Card>

      <Card>
        <SectionHeader eyebrow={t("dashboard.video.eyebrow")} title={t("dashboard.video.title")} description={t("dashboard.video.description")} />
        <CardContent>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            <FormField label={t("dashboard.maxResolution")} htmlFor="max-size">
              <Select value={String(options.maxSize ?? "original")} onValueChange={(value) => updateNumber("maxSize", value)}>
                <SelectTrigger id="max-size" className="text-[10px]!"><SelectValue className="text-[10px]!" /></SelectTrigger>
                <SelectContent className="text-[10px]!">
                  <SelectItem value="original">{t("dashboard.originalResolution")}</SelectItem>
                  <SelectItem value="1024">1024 px</SelectItem>
                  <SelectItem value="1280">1280 px</SelectItem>
                  <SelectItem value="1920">1920 px</SelectItem>
                  <SelectItem value="2560">2560 px</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label={t("dashboard.maxFrameRate")} htmlFor="max-fps">
              <Select value={String(options.maxFps ?? 60)} onValueChange={(value) => updateNumber("maxFps", value)}>
                <SelectTrigger id="max-fps" className="text-[10px]!"><SelectValue className="text-[10px]!" /></SelectTrigger>
                <SelectContent className="text-[10px]!">
                  <SelectItem value="30">30 FPS</SelectItem>
                  <SelectItem value="60">60 FPS</SelectItem>
                  <SelectItem value="90">90 FPS</SelectItem>
                  <SelectItem value="120">120 FPS</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label={t("dashboard.videoBitrate")} htmlFor="video-bitrate">
              <div className="flex h-9 items-center gap-3 rounded-lg border border-input bg-card px-3 shadow-xs">
                <Slider id="video-bitrate" aria-label={t("dashboard.videoBitrate")} min={2} max={32} step={1} value={[options.videoBitrateMbps ?? 8]} onValueChange={([videoBitrateMbps]) => setOptions((current) => ({ ...current, videoBitrateMbps }))} />
                <span className="w-14 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">{options.videoBitrateMbps ?? 8} Mbps</span>
              </div>
            </FormField>
            <FormField label={t("dashboard.videoCodec")} htmlFor="video-codec">
              <Select value={options.videoCodec} onValueChange={(videoCodec) => setOptions((current) => ({ ...current, videoCodec: videoCodec as ScrcpyOptions["videoCodec"] }))}>
                <SelectTrigger id="video-codec" className="text-[10px]!"><SelectValue className="text-[10px]!" /></SelectTrigger>
                <SelectContent className="text-[10px]!">
                  <SelectItem value="h264">H.264 · {t("dashboard.codec.compatible")}</SelectItem>
                  <SelectItem value="h265">H.265 · {t("dashboard.codec.quality")}</SelectItem>
                  <SelectItem value="vp8">VP8 · {t("dashboard.codec.requiresSupport")}</SelectItem>
                  <SelectItem value="vp9">VP9 · {t("dashboard.codec.requiresSupport")}</SelectItem>
                  <SelectItem value="av1">AV1 · {t("dashboard.codec.requiresSupport")}</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-2">
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div className="grid gap-1.5">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-primary uppercase">{t("dashboard.output.eyebrow")}</p>
            <CardTitle className="text-sm">{t("dashboard.recording.title")}</CardTitle>
          </div>
          {options.recordPath && <Badge className="bg-primary/10 text-primary" variant="secondary"><FileVideo2 className="size-3" />{t("dashboard.recording.enabled")}</Badge>}
        </CardHeader>
        <CardContent className="mt-3 grid grid-cols-[minmax(0,1fr)_12rem] gap-3">
          <CardDescription className="col-span-2 text-xs leading-relaxed">{t("dashboard.recording.description")}</CardDescription>
          <div className="flex h-9 min-w-0 items-center gap-2 rounded-lg border border-border bg-muted/35 px-3">
            <FileVideo2 className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground">{options.recordPath || t("dashboard.recording.none")}</span>
            {options.recordPath && <Button className="h-6 px-2" variant="ghost" size="sm" onClick={() => setOptions((current) => ({ ...current, recordPath: undefined }))}>{t("dashboard.recording.clear")}</Button>}
          </div>
          <Button className="w-full border-dashed" variant="outline" size="sm" onClick={onChooseRecordingPath}>
            <FolderOpen />{t("dashboard.recording.choose")}
          </Button>
        </CardContent>
      </Card>

      <Card className="col-span-2">
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div className="grid gap-1.5">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-primary uppercase">{t("dashboard.diagnostics.eyebrow")}</p>
            <CardTitle className="text-sm">{t("dashboard.logs.title")}</CardTitle>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-muted-foreground" onClick={onClearLogs}><Trash2 className="size-3.5" />{t("dashboard.logs.clear")}</Button>
        </CardHeader>
        <CardContent className="mt-3">
          <div className="log-scrollbar h-36 overflow-auto rounded-lg border border-white/10 bg-sidebar p-3 font-mono text-[9px] leading-relaxed text-white/65 shadow-inner" role="log">
            {logs.length === 0 ? (
              <span className="text-white/30">{t("dashboard.logs.empty")}</span>
            ) : logs.slice(-80).map((log, index) => (
              <div className="grid grid-cols-[62px_1fr] gap-2" key={`${log.timestampMs}-${index}`}>
                <time className="text-white/25">{new Date(Number(log.timestampMs)).toLocaleTimeString(language, { hour12: false })}</time>
                <span className={cn(log.level === "error" && "text-rose-300")}>
                  {translateLocalizedMessage(
                    log.messageKey
                      ? { key: log.messageKey, values: log.messageValues }
                      : undefined,
                    t,
                  ) ?? log.message ?? ""}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <CardHeader className="pb-4">
      <p className="text-[10px] font-semibold tracking-[0.14em] text-primary uppercase">{eyebrow}</p>
      <CardTitle className="text-sm">{title}</CardTitle>
      <CardDescription className="pt-0.5 text-xs">{description}</CardDescription>
    </CardHeader>
  );
}

function FormField({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return <div className="grid min-w-0 gap-2"><Label htmlFor={htmlFor} className="text-[10px]!">{label}</Label>{children}</div>;
}

function SettingToggle({ id, icon, label, hint, checked, onCheckedChange }: { id: string; icon: ReactNode; label: string; hint: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return (
    <Label htmlFor={id} className="flex min-h-14 cursor-pointer items-center gap-3 py-2 font-normal">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-primary/75 [&_svg]:size-4">{icon}</span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="block text-xs leading-4 font-medium text-foreground">{label}</span>
        <span className="block text-[10px] leading-4 text-muted-foreground">{hint}</span>
      </span>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </Label>
  );
}

function PresetIcon({ id }: { id: string }) {
  const icons: Record<string, ReactNode> = {
    default: <Sparkles className="size-3.5" />,
    smooth: <Gauge className="size-3.5" />,
    quality: <ScanEye className="size-3.5" />,
    readonly: <Eye className="size-3.5" />,
  };
  return icons[id] ?? <Activity className="size-3.5" />;
}

function presetMatches(current: ScrcpyOptions, expected: Partial<ScrcpyOptions>) {
  return Object.entries(expected).every(([key, value]) => current[key as keyof ScrcpyOptions] === value);
}
