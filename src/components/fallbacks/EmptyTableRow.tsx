import { TableCell, TableRow } from "@/components/ui/table";

interface EmptyTableRowProps {
  colSpan: number;
  message: string;
}

const EmptyTableRow = ({ colSpan, message }: EmptyTableRowProps) => (
  <TableRow>
    <TableCell colSpan={colSpan} className="py-10 text-center text-white/45">
      {message}
    </TableCell>
  </TableRow>
);

export default EmptyTableRow;
