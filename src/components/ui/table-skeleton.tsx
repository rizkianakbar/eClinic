import { placeholders, SkeletonLine } from './skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

type Column = {
  /** The real column title. */
  label: string;
  /** The same classes as the real <TableHead> (responsive hiding, widths, alignment). */
  className?: string;
  /** Width of the placeholder bar in this column, e.g. "w-32". */
  bar?: string;
};

type TableSkeletonProps = {
  columns: Column[];
  rows?: number;
  /** Text lines per cell: rows with a second line (name + detail) are taller. */
  lines?: 1 | 2;
};

/** A table with its real column titles and placeholder rows of the real height. */
export function TableSkeleton(props: TableSkeletonProps) {
  return (
    <Table aria-hidden>
      <TableHeader>
        <TableRow>
          {props.columns.map((column) => (
            <TableHead key={column.label} className={column.className}>
              {column.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {placeholders(props.rows ?? 6).map((key) => (
          <TableRow key={key}>
            {props.columns.map((column, index) => (
              <TableCell key={column.label} className={column.className}>
                <span
                  className={column.className?.includes('text-right') ? 'flex flex-col items-end' : 'flex flex-col'}>
                  <SkeletonLine className={column.bar ?? 'w-24'} />
                  {props.lines === 2 && index === 0 && <SkeletonLine className="w-20" />}
                </span>
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
