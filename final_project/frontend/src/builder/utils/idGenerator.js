// builder/utils/idGenerator.js
// ESM version for frontend use

import { nanoid } from 'nanoid';

export function generateId(prefix = 'el') {
  return `${prefix}_${nanoid(8)}`;
}

export function generateSectionId()  { return generateId('section'); }
export function generateColumnId()   { return generateId('col'); }
export function generateWidgetId(type = 'widget') { return generateId(type); }

export default generateId;
