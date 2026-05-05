// Node numbering helpers.
//
// Format: "AAA-BBB" where AAA-BBB are zero-padded 3-digit groups. The self
// node is locked to "000-000". Every other node is auto-assigned the
// smallest available index starting at 1.
//
// IMPORTANT: When a node is deleted, all higher-numbered nodes shift DOWN
// to fill the gap (per spec). That means saved JSON files reference numbers
// by their position at save time only — node identity is the UUID, not the
// number. UI always displays the current (post-reflow) number.

const SELF_NUMBER = '000-000';

function format(idx) {
  // idx is 0..999999. Split into AAA-BBB groups.
  const high = Math.floor(idx / 1000);
  const low = idx % 1000;
  return `${String(high).padStart(3, '0')}-${String(low).padStart(3, '0')}`;
}

// Compute the full ordered list of numbers for a set of non-self nodes,
// preserving their insertion order (the order they appear in the array).
// Returns a new array of nodes with `number` reassigned.
export function reflowNumbers(nodes) {
  let counter = 1; // 0 is reserved for the self node
  return nodes.map(n => {
    if (n.isSelf) return { ...n, number: SELF_NUMBER };
    return { ...n, number: format(counter++) };
  });
}

export { SELF_NUMBER };
