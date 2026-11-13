import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataImportDialog } from '@/features/data-import/data-import-dialog';
import { SettingsActiveToggle } from '@/features/settings/settings-active-toggle';
import { formatRupiah } from '@/lib/money';
import { setServiceActiveAction } from './billing.actions';
import { doctorFeeAmount, type ServiceValues } from './billing.lib';
import type { listServices } from './billing.service';
import { BillingPackageDialog } from './billing-package-dialog';
import { BillingServiceDialog } from './billing-service-dialog';

type ServiceType = 'consultation' | 'procedure' | 'other' | 'package';

type BillingServicesProps = {
  services: Awaited<ReturnType<typeof listServices>>;
};

function feeLabel(service: { price: number; doctor_fee_type: string; doctor_fee_value: number }) {
  if (service.doctor_fee_type === 'none') return '-';

  const amount = formatRupiah(doctorFeeAmount(service));

  return service.doctor_fee_type === 'percent' ? `${service.doctor_fee_value}% (${amount})` : amount;
}

export function BillingServices(props: BillingServicesProps) {
  const t = useTranslations('billing');
  const tc = useTranslations('common');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{t('services.intro')}</p>
        <div className="flex gap-2">
          <DataImportDialog kind="services" />
          <BillingServiceDialog mode="create" />
        </div>
      </div>
      {props.services.length === 0 ? (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">{t('services.empty')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('services.colName')}</TableHead>
              <TableHead className="hidden md:table-cell">{t('services.type')}</TableHead>
              <TableHead className="hidden text-right sm:table-cell">{t('services.price')}</TableHead>
              <TableHead className="hidden text-right md:table-cell">{t('services.doctorFee')}</TableHead>
              <TableHead className="hidden md:table-cell">{t('services.colStatus')}</TableHead>
              <TableHead className="text-right">{t('services.colActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.services.map((service) => (
              <TableRow key={service.id} className={service.is_active ? undefined : 'text-muted-foreground'}>
                <TableCell>
                  <p className="font-medium">{service.name}</p>
                  {service.type === 'package' && (
                    <p className="text-xs text-muted-foreground">
                      {service.contents.length > 0
                        ? service.contents
                            .map((item) => `${item.service?.name}${item.qty > 1 ? ` x${item.qty}` : ''}`)
                            .join(', ')
                        : t('services.noContents')}
                    </p>
                  )}
                  {/* Phones and small tablets: the details fold into one line under the name. */}
                  <p className="tabular text-[0.8125rem] text-muted-foreground md:hidden">
                    <span className="sm:hidden">{formatRupiah(service.price)} · </span>
                    {t(`serviceType.${service.type as ServiceType}`)}
                    {service.doctor_fee_type !== 'none' && ` · ${t('services.feeShort', { fee: feeLabel(service) })}`}
                    {!service.is_active && ` · ${t('services.inactiveShort')}`}
                  </p>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {t(`serviceType.${service.type as ServiceType}`)}
                </TableCell>
                <TableCell className="hidden text-right sm:table-cell">{formatRupiah(service.price)}</TableCell>
                <TableCell className="hidden text-right md:table-cell">{feeLabel(service)}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant={service.is_active ? 'secondary' : 'outline'}>
                    {service.is_active ? tc('active') : tc('inactive')}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end gap-1 sm:flex-row sm:justify-end">
                    <BillingServiceDialog mode="edit" service={service as ServiceValues & { id: string }} />
                    {service.type === 'package' && (
                      <BillingPackageDialog
                        packageId={service.id}
                        packageName={service.name}
                        contents={service.contents.map((item) => ({ service_id: item.service_id, qty: item.qty }))}
                        services={props.services.filter((other) => other.type !== 'package' && other.is_active)}
                      />
                    )}
                    <SettingsActiveToggle
                      id={service.id}
                      isActive={service.is_active}
                      action={setServiceActiveAction}
                      name={service.name}
                      consequence={t('services.deactivateConsequence')}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
