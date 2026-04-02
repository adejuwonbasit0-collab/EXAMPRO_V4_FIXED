// builder/dnd/SortableWidgetList.jsx
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

export default function SortableWidgetList({ widgetIds, children }) {
  return (
    <SortableContext items={widgetIds} strategy={verticalListSortingStrategy}>
      {children}
    </SortableContext>
  );
}
