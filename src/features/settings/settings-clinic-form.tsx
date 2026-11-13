"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImageUpIcon, LoaderCircleIcon, Trash2Icon } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { segmentedGroup, segmentedItem } from "@/components/ui/segmented";
import { Textarea } from "@/components/ui/textarea";
import { useActionMutation } from "@/lib/query";
import { cn } from "@/lib/utils";
import { removeClinicLogoAction, updateClinicProfileAction, uploadClinicLogoAction } from "./settings.actions";
import {
  clinicProfileSchema,
  LOGO_TYPES,
  logoFileError,
  type ClinicProfileInput,
  type ClinicProfileValues,
} from "./settings.lib";
import type { getClinicProfile } from "./settings.service";
import { SettingsLetterhead } from "./settings-letterhead";

type SettingsClinicFormProps = {
  clinic: NonNullable<Awaited<ReturnType<typeof getClinicProfile>>>;
};

const IDLE_PRESETS = [5, 10, 15, 30, 60] as const;

type SectionProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

/** One card per topic: what it is on the left, the fields on the right. */
function Section(props: SectionProps) {
  return (
    <section className="grid gap-4 border-b px-5 py-5 last:border-b-0 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-6">
      <div>
        <h2 className="text-sm font-semibold">{props.title}</h2>
        <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">{props.description}</p>
      </div>
      <div className="flex min-w-0 flex-col gap-4">{props.children}</div>
    </section>
  );
}

/** Clinic profile with a live preview of the letterhead every printed letter and report carries. */
export function SettingsClinicForm(props: SettingsClinicFormProps) {
  const { clinic } = props;
  const save = useActionMutation(updateClinicProfileAction);
  const upload = useActionMutation(uploadClinicLogoAction);
  const remove = useActionMutation(removeClinicLogoAction);
  const fileRef = useRef<HTMLInputElement>(null);
  const form = useForm<ClinicProfileInput, unknown, ClinicProfileValues>({
    resolver: zodResolver(clinicProfileSchema),
    defaultValues: {
      name: clinic.name,
      address: clinic.address ?? "",
      phone: clinic.phone ?? "",
      email: clinic.email ?? "",
      license_no: clinic.license_no ?? "",
      idle_logout_minutes: String(clinic.idle_logout_minutes),
    },
  });
  const { errors, isDirty } = form.formState;
  const live = useWatch({ control: form.control });
  const idle = Number(live.idle_logout_minutes);

  function pickLogo(file: File | undefined) {
    if (!file) return;
    const problem = logoFileError(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    const data = new FormData();
    data.set("logo", file);
    upload.mutate(data, { onSuccess: () => toast.success("Logo diperbarui.") });
  }

  const logoBusy = upload.isPending || remove.isPending;

  return (
    <form
      noValidate
      className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]"
      onSubmit={form.handleSubmit((values) =>
        save.mutate(values, {
          onSuccess: () => {
            toast.success("Profil klinik tersimpan.");
            form.reset(form.getValues());
          },
        }),
      )}
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
          <Section title="Identitas" description="Nama dan logo yang tampil di kop surat, kuitansi, dan laporan.">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={logoBusy}
                aria-label={clinic.logoUrl ? "Ganti logo" : "Unggah logo"}
                className={cn(
                  "group relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/50 transition-colors hover:border-primary/60 focus-visible:ring-3 focus-visible:ring-primary/20 focus-visible:outline-none",
                  !clinic.logoUrl && "border-dashed",
                )}
              >
                {clinic.logoUrl ? (
                  <Image src={clinic.logoUrl} alt="Logo klinik" width={80} height={80} unoptimized className="size-full object-contain p-1.5" />
                ) : (
                  <ImageUpIcon className="size-6 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden />
                )}
                {logoBusy && (
                  <span className="absolute inset-0 flex items-center justify-center bg-card/80">
                    <LoaderCircleIcon className="size-5 animate-spin text-primary" aria-hidden />
                  </span>
                )}
              </button>
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={logoBusy} onClick={() => fileRef.current?.click()}>
                    {clinic.logoUrl ? "Ganti logo" : "Unggah logo"}
                  </Button>
                  {clinic.logoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={logoBusy}
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => remove.mutate(undefined, { onSuccess: () => toast.success("Logo dihapus.") })}
                    >
                      <Trash2Icon aria-hidden />
                      Hapus
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">PNG, JPG, atau WEBP, maksimal 1 MB. Latar transparan paling rapi.</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept={LOGO_TYPES.join(",")}
                className="sr-only"
                tabIndex={-1}
                onChange={(event) => {
                  pickLogo(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </div>
            <FormField label="Nama klinik" htmlFor="clinic_name" error={errors.name?.message}>
              <Input id="clinic_name" {...form.register("name")} />
            </FormField>
            <FormField label="Nomor izin klinik" htmlFor="clinic_license" error={errors.license_no?.message} hint="Tampil di bawah alamat pada kop surat">
              <Input id="clinic_license" placeholder="Contoh: 503/123/DPMPTSP/2026" {...form.register("license_no")} />
            </FormField>
          </Section>

          <Section title="Kontak" description="Alamat dan nomor yang bisa dihubungi pasien.">
            <FormField label="Alamat" htmlFor="clinic_address" error={errors.address?.message}>
              <Textarea id="clinic_address" rows={2} placeholder="Jalan, kelurahan, kecamatan, kota" {...form.register("address")} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Telepon" htmlFor="clinic_phone" error={errors.phone?.message}>
                <Input id="clinic_phone" type="tel" {...form.register("phone")} />
              </FormField>
              <FormField label="Email" htmlFor="clinic_email" error={errors.email?.message} hint="Opsional">
                <Input id="clinic_email" type="email" {...form.register("email")} />
              </FormField>
            </div>
          </Section>

          <Section title="Keamanan" description="Komputer bersama keluar sendiri bila lama tidak dipakai.">
            <FormField
              label="Keluar otomatis setelah"
              htmlFor="clinic_idle"
              error={errors.idle_logout_minutes?.message}
              hint="Lebih pendek lebih aman di meja depan; terlalu pendek membuat dokter sering login ulang."
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className={segmentedGroup} role="group" aria-label="Pilihan cepat">
                  {IDLE_PRESETS.map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      className={segmentedItem(idle === minutes)}
                      onClick={() => form.setValue("idle_logout_minutes", String(minutes), { shouldDirty: true, shouldValidate: true })}
                    >
                      {minutes}
                    </button>
                  ))}
                </div>
                <div className="relative w-28">
                  <Input id="clinic_idle" type="number" inputMode="numeric" min={1} max={240} className="pr-14" {...form.register("idle_logout_minutes")} />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">menit</span>
                </div>
              </div>
            </FormField>
          </Section>
        </div>

        <div
          className={cn(
            "sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-xl border bg-card/95 px-4 py-2.5 shadow-[0_8px_24px_rgb(20_32_29/0.10)] backdrop-blur transition-[opacity,translate] duration-200 ease-[var(--ease-out)]",
            isDirty ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
          )}
          aria-hidden={!isDirty}
        >
          <p className="flex items-center gap-2 text-sm">
            <span className="size-2 rounded-full bg-amber-500" aria-hidden />
            Ada perubahan yang belum disimpan
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" disabled={save.isPending} onClick={() => form.reset()}>
              Batalkan
            </Button>
            <Button type="submit" size="sm" disabled={save.isPending}>
              {save.isPending ? "Menyimpan…" : "Simpan profil"}
            </Button>
          </div>
        </div>
      </div>

      <aside className="flex flex-col gap-2.5 xl:sticky xl:top-[4.75rem]">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Pratinjau kop surat</h2>
          <span className="text-xs text-muted-foreground">berubah saat Anda mengetik</span>
        </div>
        <div className="overflow-hidden rounded-xl border bg-muted/40 p-3">
          <div className="origin-top rounded-md bg-white p-5 text-black shadow-[0_1px_3px_rgb(20_32_29/0.12)]">
            <SettingsLetterhead
              clinic={{
                name: live.name || "Nama klinik",
                address: live.address || null,
                phone: live.phone || null,
                email: live.email || null,
                license_no: live.license_no || null,
                logoUrl: clinic.logoUrl,
              }}
            />
            <div className="mt-4 flex flex-col gap-2" aria-hidden>
              <span className="mx-auto h-2.5 w-2/5 rounded bg-black/10" />
              <span className="mt-2 h-2 w-full rounded bg-black/6" />
              <span className="h-2 w-11/12 rounded bg-black/6" />
              <span className="h-2 w-4/5 rounded bg-black/6" />
              <span className="mt-3 ml-auto h-2 w-1/3 rounded bg-black/6" />
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Dipakai di surat sakit, surat rujukan, dan laporan cetak.</p>
      </aside>
    </form>
  );
}
