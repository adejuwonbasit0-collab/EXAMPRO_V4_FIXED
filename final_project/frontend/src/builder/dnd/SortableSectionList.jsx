// builder/dnd/SortableSectionList.jsx
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

export default function SortableSectionList({ sectionIds, children }) {
  return (
    <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
      {children}
    </SortableContext>
  );
}
