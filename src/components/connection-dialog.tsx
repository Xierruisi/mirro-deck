import { ArrowLeft, BookOpenText, Link2, LoaderCircle, Wifi } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n";

interface ConnectionDialogProps {
  type?: "choose" | "pair" | "connect";
  address: string;
  pairingCode: string;
  busy: boolean;
  message?: string;
  onTypeChange: (type?: "choose" | "pair" | "connect") => void;
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
                onClick={() => onTypeChange("pair")}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Wifi className="size-5" />
                </span>
                <span className="grid min-w-0 flex-1 gap-1">
                  <span className="font-medium text-foreground">{t("dialog.pair.title")}</span>
                  <span className="whitespace-normal text-xs font-normal leading-relaxed text-muted-foreground">{t("dialog.pair.description")}</span>
                </span>
              </Button>
              <Button
                variant="outline"
                className="h-auto justify-start gap-4 rounded-xl p-4 text-left hover:border-primary/30 hover:bg-primary/[0.04]"
                onClick={() => onTypeChange("connect")}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Link2 className="size-5" />
                </span>
                <span className="grid min-w-0 flex-1 gap-1">
                  <span className="font-medium text-foreground">{t("dialog.connect.title")}</span>
                  <span className="whitespace-normal text-xs font-normal leading-relaxed text-muted-foreground">{t("dialog.connect.description")}</span>
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
        ) : (
          <>
            <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              {isPairing ? <Wifi className="size-5" /> : <Link2 className="size-5" />}
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
              <Input id="wireless-address" autoFocus value={address} onChange={(event) => onAddressChange(event.target.value)} placeholder="192.168.1.10:37099" />
            </div>
            {isPairing && (
              <div className="grid gap-2">
                <Label htmlFor="pairing-code">{t("dialog.pairingCode")}</Label>
                <Input id="pairing-code" inputMode="numeric" maxLength={6} value={pairingCode} onChange={(event) => onPairingCodeChange(event.target.value.replace(/\D/g, ""))} placeholder="123456" />
              </div>
            )}
            {message && <Alert variant="info" className="py-2.5"><AlertDescription className="col-start-1 m-0 text-foreground">{message}</AlertDescription></Alert>}

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
