// builder/sections/ColumnResizer.jsx

import { useRef, useState, useCallback } from 'react';
import useBuilderStore from '../store/useBuilderStore';

export default function ColumnResizer({ sectionId, leftColumnId, rightColumnId, leftWidth, rightWidth, sectionRef }) {
  const resizeColumns = useBuilderStore(s => s.resizeColumns);
  const [dragging, setDragging] = useState(false);
  const startX     = useRef(0);
  const startLeft  = useRef(0);
  const startRight = useRef(0);
  const totalWidth = useRef(0);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    startX.current     = e.clientX;
    startLeft.current  = leftWidth;
    startRight.current = rightWidth;

    // Get section pixel width for percentage calculation
    const sectionEl = sectionRef?.current || e.currentTarget.closest('[data-section-id]');
    totalWidth.current = sectionEl ? sectionEl.getBoundingClientRect().width : 1200;

    const onMouseMove = (moveEvent) => {
      const delta      = moveEvent.clientX - startX.current;
      const deltaPercent = (delta / totalWidth.current) * 100;

      // Enforce minimum column width of 10%
      const newLeft  = Math.max(10, Math.min(startLeft.current  + deltaPercent, startLeft.current + startRight.current - 10));
      const newRight = parseFloat(((startLeft.current + startRight.current) - newLeft).toFixed(2));
      const finalLeft = parseFloat(newLeft.toFixed(2));

      resizeColumns(sectionId, leftColumnId, finalLeft, rightColumnId, newRight);
    };

    const onMouseUp = () => {
      setDragging(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [leftWidth, rightWidth, sectionId, leftColumnId, rightColumnId, resizeColumns]);

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        width:          '10px',
        flexShrink:     0,
        cursor:         'col-resize',
        position:       'relative',
        zIndex:         50,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        margin:         '0 -5px',   // overlap the column gap so it's always hittable
        alignSelf:      'stretch',
      }}
      title="Drag to resize columns"
    >
      {/* Visual indicator — only visible on hover/drag */}
      <div style={{
        width:        dragging ? '3px' : '2px',
        height:       dragging ? '100%' : '40%',
        minHeight:    '20px',
        background:   dragging ? '#818CF8' : 'rgba(129,140,248,.25)',
        borderRadius: '2px',
        transition:   dragging ? 'none' : 'all .2s',
        boxShadow:    dragging ? '0 0 8px rgba(129,140,248,.6)' : 'none',
      }} />
    </div>
  );
}
