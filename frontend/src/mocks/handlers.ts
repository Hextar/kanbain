import { columnHandlers } from '@/Task/api/columnHandlers';
import { taskHandlers } from '@/Task/api/handlers';

export const handlers = [...columnHandlers, ...taskHandlers];
