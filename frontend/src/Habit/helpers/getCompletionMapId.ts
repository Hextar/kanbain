import { format } from "date-fns";

export default function getCompletionMapId(id: string, date: Date): string {
    return `${id}-${format(date, 'yyyy-MM-dd')}`;
}