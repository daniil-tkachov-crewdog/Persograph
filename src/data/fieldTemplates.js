// Global registry of "custom field" templates. A template defines an
// add-able field type (id + label + value type). When a user picks one from
// the AddFieldModal dropdown, an instance is appended to the node's
// `customFields` array.
//
// Caveat: template `id` is the contract — never rename an id without a
// migration step on saved JSON files, or stored values will lose their
// label association.
export const FIELD_TEMPLATES = [
  { id: 'credit-card', label: 'Credit card', type: 'text' },
  { id: 'car',         label: 'Car',         type: 'text' },
  { id: 'siblings',    label: 'Siblings',    type: 'text' },
  { id: 'children',    label: 'Children',    type: 'text' },
  { id: 'parents',     label: 'Parents',     type: 'text' },
  { id: 'languages',   label: 'Languages',   type: 'text' },
  { id: 'pets',        label: 'Pets',        type: 'text' },
  { id: 'email',       label: 'Email',       type: 'text' },
  { id: 'phone',       label: 'Phone',       type: 'text' }
];

export function findTemplate(id) {
  return FIELD_TEMPLATES.find(t => t.id === id);
}
