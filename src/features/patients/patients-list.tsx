import { ChevronRightIcon, UsersIcon } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { EmptyState } from '@/components/ui/empty-state';
import { PageLinks } from '@/components/ui/page-links';
import { segmentedGroup, segmentedItem } from '@/components/ui/segmented';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InventorySearch } from '@/features/inventory/inventory-search';
import { formatDate, relativeDay } from '@/lib/dates';
import { ageInYears, formatIdNumber, formatPhone, initials } from './patients.lib';
import { type listPatients, PATIENTS_PAGE_SIZE, type PatientPayerFilter } from './patients.service';

type PatientsListProps = Awaited<ReturnType<typeof listPatients>> & {
  query: string;
  page: number;
  payer: PatientPayerFilter;
  today: string;
};

const FILTERS: readonly PatientPayerFilter[] = ['all', 'bpjs', 'umum'];

/** Every patient: who they are, how to reach them, and when they last came. */
export function PatientsList(props: PatientsListProps) {
  const t = useTranslations();
  const locale = useLocale();

  const params = (payer: PatientPayerFilter) =>
    `?${new URLSearchParams({ ...(props.query && { q: props.query }), ...(payer !== 'all' && { payer }) })}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label={t('patients.filter.label')} className={segmentedGroup}>
          {FILTERS.map((filter) => (
            <Link
              key={filter}
              href={params(filter)}
              aria-current={props.payer === filter ? 'true' : undefined}
              className={segmentedItem(props.payer === filter)}>
              {filter === 'all' ? t('patients.filter.all') : t(`payer.${filter}`)}
            </Link>
          ))}
        </nav>
        <InventorySearch query={props.query} placeholder={t('patients.listSearch')} />
      </div>

      {props.patients.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title={props.query ? t('patients.list.notFound') : t('patients.list.empty')}
          description={props.query ? t('patients.list.notFoundHint') : t('patients.list.emptyHint')}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('patients.list.patient')}</TableHead>
              <TableHead className="hidden md:table-cell">{t('patients.list.contact')}</TableHead>
              <TableHead className="hidden sm:table-cell">{t('patients.list.lastVisit')}</TableHead>
              <TableHead className="hidden text-right xl:table-cell">{t('patients.list.visits')}</TableHead>
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
                          <span className="text-xs font-normal text-muted-foreground">
                            {t('patients.list.inactive')}
                          </span>
                        )}
                      </Link>
                      <span className="tabular block text-[0.8125rem] text-muted-foreground">
                        {t('patients.mrn')} {patient.mrn} · {t(`sex.${patient.sex as 'male' | 'female'}`)},{' '}
                        {t('patients.ageShort', { age: ageInYears(patient.birth_date) })}
                      </span>
                      {/* Phones: the last visit folds under the name instead of a squeezed column. */}
                      <span className="block text-[0.8125rem] text-muted-foreground sm:hidden">
                        {patient.lastVisit
                          ? t('patients.list.last', {
                              when: relativeDay(patient.lastVisit, props.today, locale).toLowerCase(),
                            })
                          : t('patients.list.never')}
                      </span>
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="tabular block">
                    {patient.phone ? (
                      formatPhone(patient.phone)
                    ) : (
                      <span className="text-muted-foreground">{t('patients.list.noPhone')}</span>
                    )}
                  </span>
                  <span className="tabular block text-[0.8125rem] text-muted-foreground">
                    {patient.nik
                      ? t('patients.list.nik', { nik: formatIdNumber(patient.nik) })
                      : t('patients.list.noNik')}
                  </span>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {patient.lastVisit ? (
                    <>
                      <span className="block">{relativeDay(patient.lastVisit, props.today, locale)}</span>
                      <span className="block text-[0.8125rem] text-muted-foreground">
                        {formatDate(patient.lastVisit, locale)}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">{t('patients.list.neverShort')}</span>
                  )}
                </TableCell>
                <TableCell className="tabular hidden text-right xl:table-cell">
                  {patient.visitCount > 0 ? (
                    <>
                      <span className="font-semibold">{patient.visitCount}</span>{' '}
                      <span className="text-muted-foreground">{t('patients.list.times')}</span>
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
        countLabel={t('patients.list.countLabel', { count: props.total })}
      />
    </div>
  );
}
