import { ArrowLeft, ArrowRight, BookOpenText, Cable, Link2, LoaderCircle, TriangleAlert, Wifi } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n";

export type ConnectionDialogStep = "choose" | "usb" | "pair" | "connect";

interface ConnectionDialogProps {
  type?: ConnectionDialogStep;
  address: string;
  pairingCode: string;
  busy: boolean;
  message?: string;
  onTypeChange: (type?: ConnectionDialogStep) => void;
  onAddressChange: (value: string) => void;
  onPairingCodeChange: (value: string) => void;
  onGuideOpen: () => void;
  onSubmit: () => void;
}

export function ConnectionDialog({
  type,
  address,
  pairingCode,
  busy,
  message,
  onTypeChange,
  onAddressChange,
  onPairingCodeChange,
  onGuideOpen,
  onSubmit,
}: ConnectionDialogProps) {
  const { t } = useI18n();
  const isPairing = type === "pair";
  const isChoosing = type === "choose";
  const isUsb = type === "usb";

  return (
    <Dialog open={Boolean(type)} onOpenChange={(open) => { if (!open && !busy) onTypeChange(undefined); }}>
      <DialogContent onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }} onPointerDownOutside={(event) => { if (busy) event.preventDefault(); }}>
        {isChoosing ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("dialog.addDevice.title")}</DialogTitle>
              <DialogDescription>{t("dialog.addDevice.description")}</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-1">
              <Button
                variant="outline"
                className="h-auto justify-start gap-4 rounded-xl p-4 text-left hover:border-primary/30 hover:bg-primary/[0.04]"
                onClick={() => onTypeChange("usb")}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Cable className="size-5" />
                </span>
                <span className="grid min-w-0 flex-1 gap-1">
                  <span className="font-medium text-foreground">{t("settings.connection.usb.title")}</span>
                  <span className="whitespace-normal text-xs font-normal leading-relaxed text-muted-foreground">{t("settings.connection.usb.description")}</span>
                </span>
              </Button>
              <Button
                variant="outline"
                className="h-auto justify-start gap-4 rounded-xl p-4 text-left hover:border-primary/30 hover:bg-primary/[0.04]"
                onClick={() => onTypeChange("pair")}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Wifi className="size-5" />
                </span>
                <span className="grid min-w-0 flex-1 gap-1">
                  <span className="font-medium text-foreground">{t("settings.connection.wifi.title")}</span>
                  <span className="whitespace-normal text-xs font-normal leading-relaxed text-muted-foreground">{t("settings.connection.wifi.description")}</span>
                </span>
              </Button>
            </div>
            <Button
              variant="ghost"
              className="justify-start text-muted-foreground"
              onClick={onGuideOpen}
            >
              <BookOpenText />
              {t("dialog.connectionGuide")}
            </Button>
          </>
        ) : isUsb ? (
          <>
            <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <Cable className="size-5" />
            </div>
            <DialogHeader>
              <DialogTitle>{t("settings.connection.usb.title")}</DialogTitle>
              <DialogDescription>{t("settings.connection.usb.description")}</DialogDescription>
            </DialogHeader>

            <ol className="grid gap-3 rounded-xl border border-border bg-card p-4">
              {[
                t("settings.connection.usb.step1"),
                t("settings.connection.usb.step2"),
                t("settings.connection.usb.step3"),
              ].map((step, index) => (
                <li key={step} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            <DialogFooter className="sm:justify-between">
              <Button variant="ghost" className="mr-auto" onClick={() => onTypeChange("choose")}>
                <ArrowLeft />{t("dialog.backToMethods")}
              </Button>
              <Button onClick={() => onTypeChange(undefined)}>{t("dialog.usb.done")}</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              {isPairing ? <Wifi className="size-5" /> : <Link2 className="size-5" />}
            </div>
            <div className="flex items-center gap-2 text-xs font-medium" aria-label={t("dialog.wifi.progress")}>
              <span className={isPairing ? "text-primary" : "text-muted-foreground"}>{t("dialog.wifi.pairStep")}</span>
              <span className="h-px flex-1 bg-border" />
              <span className={isPairing ? "text-muted-foreground" : "text-primary"}>{t("dialog.wifi.connectStep")}</span>
            </div>
            <DialogHeader>
              <DialogTitle>{isPairing ? t("dialog.pairForm.title") : t("dialog.connectForm.title")}</DialogTitle>
              <DialogDescription>
                {isPairing
                  ? t("dialog.pairForm.description")
                  : t("dialog.connectForm.description")}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-2">
              <Label htmlFor="wireless-address">{t("dialog.address")}</Label>
              <Input id="wireless-address" autoFocus autoComplete="off" spellCheck={false} value={address} onChange={(event) => onAddressChange(event.target.value)} placeholder="192.168.1.10:37099" />
            </div>
            {isPairing && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="pairing-code">{t("dialog.pairingCode")}</Label>
                  <Input id="pairing-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={pairingCode} onChange={(event) => onPairingCodeChange(event.target.value.replace(/\D/g, ""))} placeholder="123456" />
                </div>
                <Button variant="link" className="h-auto w-fit px-0 py-0 text-xs" onClick={() => onTypeChange("connect")} disabled={busy}>
                  {t("dialog.skipPairing")}<ArrowRight />
                </Button>
              </>
            )}
            {message && <Alert variant="info" className="py-2.5"><AlertDescription className="col-start-1 m-0 text-foreground">{message}</AlertDescription></Alert>}
            {!isPairing && (
              <Alert variant="warning">
                <TriangleAlert />
                <AlertTitle>{t("dialog.connectForm.noticeTitle")}</AlertTitle>
                <AlertDescription>{t("dialog.connectForm.noticeDescription")}</AlertDescription>
              </Alert>
            )}

            <DialogFooter className="sm:justify-between">
              <Button variant="ghost" className="mr-auto" onClick={() => onTypeChange("choose")} disabled={busy}>
                <ArrowLeft />{t("dialog.backToMethods")}
              </Button>
              <Button disabled={busy || !address.trim() || (isPairing && pairingCode.length !== 6)} onClick={onSubmit}>
                {busy && <LoaderCircle className="animate-spin" />}
                {busy ? t("dialog.processing") : isPairing ? t("dialog.startPairing") : t("dialog.connectDevice")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
