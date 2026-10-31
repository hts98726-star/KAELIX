import { Card } from "@/components/ui/card";
export function DataTable({
  columns,
  caption,
  children,
}: {
  columns: string[];
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b bg-muted/40 text-[10px] text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th scope="col" key={column} className="px-5 py-4 font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">{children}</tbody>
        </table>
      </div>
    </Card>
  );
}
