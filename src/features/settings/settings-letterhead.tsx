import Image from 'next/image';

type SettingsLetterheadProps = {
  clinic: {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    license_no: string | null;
    logoUrl: string | null;
  };
};

/** Clinic letterhead (kop surat) for printed letters and reports. */
export function SettingsLetterhead(props: SettingsLetterheadProps) {
  const { clinic } = props;
  const contact = [clinic.phone && `Telp. ${clinic.phone}`, clinic.email].filter(Boolean).join(' · ');

  return (
    <header className="flex items-center gap-4 border-b-2 border-black pb-3">
      {clinic.logoUrl && (
        <Image src={clinic.logoUrl} alt="" width={72} height={72} unoptimized className="size-[72px] object-contain" />
      )}
      <div className="flex-1 text-center">
        <p className="text-xl font-bold uppercase">{clinic.name}</p>
        {clinic.address && <p className="text-sm">{clinic.address}</p>}
        {contact && <p className="text-sm">{contact}</p>}
        {clinic.license_no && <p className="text-xs">Izin: {clinic.license_no}</p>}
      </div>
      {clinic.logoUrl && <div className="size-[72px]" aria-hidden />}
    </header>
  );
}
