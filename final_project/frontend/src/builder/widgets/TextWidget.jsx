// builder/widgets/TextWidget.jsx
import React from 'react';

export default function TextWidget({ settings = {} }) {
  const {
    content = '<p>Add your text here. Click to edit.</p>',
    text_color,
    font_size,
    text_align = 'left',
    line_height,
    letter_spacing,
  } = settings;

  const style = {
    color:         text_color   || undefined,
    fontSize:      font_size    || undefined,
    textAlign:     text_align,
    lineHeight:    line_height  || undefined,
    letterSpacing: letter_spacing ? `${letter_spacing}px` : undefined,
    wordBreak:     'break-word',
  };

  return (
    <div
      className="widget-text"
      style={style}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
