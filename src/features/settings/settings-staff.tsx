import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROLE_LABELS } from "@/features/auth/auth.constants";
import type { Session } from "@/lib/auth";
import { setStaffActiveAction } from "./settings.actions";
import type { listStaff } from "./settings.service";
import { SettingsActiveToggle } from "./settings-active-toggle";
import { SettingsStaffDialog } from "./settings-staff-dialog";
import { SettingsStaffPasswordDialog } from "./settings-staff-password-dialog";

type SettingsStaffProps = {
  session: Session;
  staff: Awaited<ReturnType<typeof listStaff>>;
};

export function SettingsStaff(props: SettingsStaffProps) {
  const { session } = props;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Staf login dengan email dan kata sandi dari sini. Staf nonaktif langsung kehilangan akses.
        </p>
        <SettingsStaffDialog mode="create" actorRole={session.role} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Peran</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.staff.map((member) => {
            const isSelf = member.id === session.userId;
            const locked = isSelf || (member.role === "owner" && session.role !== "owner");
            return (
              <TableRow key={member.id} className={member.is_active ? undefined : "text-muted-foreground"}>
                <TableCell className="font-medium">{member.full_name}</TableCell>
                <TableCell>{member.email ?? "-"}</TableCell>
                <TableCell>{ROLE_LABELS[member.role]}</TableCell>
                <TableCell>
                  <Badge variant={member.is_active ? "secondary" : "outline"}>
                    {member.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {locked ? (
                    <span className="text-sm text-muted-foreground">{isSelf ? "Akun Anda" : "Hanya pemilik"}</span>
                  ) : (
                    <div className="flex justify-end gap-1">
                      <SettingsStaffDialog mode="edit" actorRole={session.role} staff={member} />
                      <SettingsStaffPasswordDialog staffId={member.id} name={member.full_name} />
                      <SettingsActiveToggle
                        id={member.id}
                        isActive={member.is_active}
                        action={setStaffActiveAction}
                        name={member.full_name}
                        consequence="Staf ini langsung keluar dan tidak bisa login lagi."
                      />
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
