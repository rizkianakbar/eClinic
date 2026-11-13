import { ChevronRightIcon, UsersIcon } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { PageLinks } from '@/components/ui/page-links';
import { segmentedGroup, segmentedItem } from '@/components/ui/segmented';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InventorySearch } from '@/features/inventory/inventory-search';
import { formatDate, relativeDay } from '@/lib/dates';
import { SEX_LABELS } from './patients.constants';
import { ageInYears, formatIdNumber, formatPhone, initials } from './patients.lib';
import { type listPatients, PATIENTS_PAGE_SIZE, type PatientPayerFilter } from './patients.service';

type PatientsListProps = Awaited<ReturnType<typeof listPatients>> & {
  query: string;
  page: number;
  payer: PatientPayerFilter;
  today: string;
};

const FILTERS: { value: PatientPayerFilter; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'bpjs', label: 'BPJS' },
  { value: 'umum', label: 'Umum' },
];

/** Every patient: who they are, how to reach them, and when they last came. */
export function PatientsList(props: PatientsListProps) {
  const params = (payer: PatientPayerFilter) =>
    `?${new URLSearchParams({ ...(props.query && { q: props.query }), ...(payer !== 'all' && { payer }) })}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Saring pembayaran" className={segmentedGroup}>
          {FILTERS.map((filter) => (
            <Link
              key={filter.value}
              href={params(filter.value)}
              aria-current={props.payer === filter.value ? 'true' : undefined}
              className={segmentedItem(props.payer === filter.value)}>
              {filter.label}
            </Link>
          ))}
        </nav>
        <InventorySearch query={props.query} placeholder="Cari nama, NIK, nomor HP, atau no. RM" />
      </div>

      {props.patients.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title={props.query ? 'Pasien tidak ditemukan' : 'Belum ada pasien'}
          description={
            props.query ? 'Periksa ejaan, atau cari dengan nomor lain.' : 'Pasien yang didaftarkan akan muncul di sini.'
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pasien</TableHead>
              <TableHead className="hidden md:table-cell">Kontak</TableHead>
              <TableHead>Kunjungan terakhir</TableHead>
              <TableHead className="hidden text-right xl:table-cell">Kunjungan</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.patients.map((patient) => (
              <TableRow key={patient.id} className={patient.is_active ? 'group relative' : 'group relative opacity-60'}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                      {initials(patient.full_name)}
                    </span>
                    <span className="min-w-0">
                      <Link
                        href={`/patients/${patient.id}`}
                        className="flex items-center gap-2 font-medium after:absolute after:inset-0 hover:underline">
                        <span className="truncate">{patient.full_name}</span>
                        {patient.bpjs_number && (
                          <span className="shrink-0 rounded bg-bpjs-soft px-1.5 text-[0.6875rem] leading-5 font-semibold text-bpjs">
                            BPJS
                          </span>
                        )}
                        {!patient.is_active && (
                          <span className="text-xs font-normal text-muted-foreground">nonaktif</span>
                        )}
                      </Link>
                      <span className="tabular block text-[0.8125rem] text-muted-foreground">
                        RM {patient.mrn} · {SEX_LABELS[patient.sex as keyof typeof SEX_LABELS]},{' '}
                        {ageInYears(patient.birth_date)} th
                      </span>
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="tabular block">
                    {patient.phone ? (
                      formatPhone(patient.phone)
                    ) : (
                      <span className="text-muted-foreground">Tidak ada HP</span>
                    )}
                  </span>
                  <span className="tabular block text-[0.8125rem] text-muted-foreground">
                    {patient.nik ? `NIK ${formatIdNumber(patient.nik)}` : 'Belum ada NIK'}
                  </span>
                </TableCell>
                <TableCell>
                  {patient.lastVisit ? (
                    <>
                      <span className="block">{relativeDay(patient.lastVisit, props.today)}</span>
                      <span className="block text-[0.8125rem] text-muted-foreground">
                        {formatDate(patient.lastVisit)}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Belum pernah</span>
                  )}
                </TableCell>
                <TableCell className="tabular hidden text-right xl:table-cell">
                  {patient.visitCount > 0 ? (
                    <>
                      <span className="font-semibold">{patient.visitCount}</span>{' '}
                      <span className="text-muted-foreground">kali</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">–</span>
                  )}
                </TableCell>
                <TableCell>
                  <ChevronRightIcon
                    className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <PageLinks
        page={props.page}
        pageSize={PATIENTS_PAGE_SIZE}
        total={props.total}
        params={{ ...(props.query && { q: props.query }), ...(props.payer !== 'all' && { payer: props.payer }) }}
        noun="pasien"
      />
    </div>
  );
}
