import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataImportDialog } from '@/features/data-import/data-import-dialog';
import { SettingsActiveToggle } from '@/features/settings/settings-active-toggle';
import { formatRupiah } from '@/lib/money';
import { setServiceActiveAction } from './billing.actions';
import { SERVICE_TYPE_LABELS } from './billing.constants';
import { doctorFeeAmount, type ServiceValues } from './billing.lib';
import type { listServices } from './billing.service';
import { BillingPackageDialog } from './billing-package-dialog';
import { BillingServiceDialog } from './billing-service-dialog';

type BillingServicesProps = {
  services: Awaited<ReturnType<typeof listServices>>;
};

function feeLabel(service: { price: number; doctor_fee_type: string; doctor_fee_value: number }) {
  if (service.doctor_fee_type === 'none') return '-';

  const amount = formatRupiah(doctorFeeAmount(service));

  return service.doctor_fee_type === 'percent' ? `${service.doctor_fee_value}% (${amount})` : amount;
}

export function BillingServices(props: BillingServicesProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Tarif konsultasi dan tindakan. Jasa dokter dipakai untuk laporan jasa medis.
        </p>
        <div className="flex gap-2">
          <DataImportDialog kind="services" />
          <BillingServiceDialog mode="create" />
        </div>
      </div>
      {props.services.length === 0 ? (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">
          Belum ada layanan. Tambahkan tarif, contoh: Konsultasi dokter umum.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead className="text-right">Tarif</TableHead>
              <TableHead className="text-right">Jasa dokter</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
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
                        : 'Isi paket belum diatur'}
                    </p>
                  )}
                </TableCell>
                <TableCell>{SERVICE_TYPE_LABELS[service.type as keyof typeof SERVICE_TYPE_LABELS]}</TableCell>
                <TableCell className="text-right">{formatRupiah(service.price)}</TableCell>
                <TableCell className="text-right">{feeLabel(service)}</TableCell>
                <TableCell>
                  <Badge variant={service.is_active ? 'secondary' : 'outline'}>
                    {service.is_active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
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
                      consequence="Layanan ini tidak bisa dipilih untuk tagihan baru."
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
