/**
 * Force annotation: wrap measured values in presentation markup so plan/SQL
 * prose carries mono tabular figures. Does not alter wording — only spans.
 */
const MEASURED =
  /((?:E|A)-Rows=[\d.]+[KM]?|\b\d+(?:\.\d+)?\s*(?:ms|seconds?|x)\b|\b\d{2,}(?:,\d{3})+\b)/giu;

export function remarkMeasuredValues() {
  return (tree) => {
    const visit = (node) => {
      if (node.type === 'text' && typeof node.value === 'string' && MEASURED.test(node.value)) {
        MEASURED.lastIndex = 0;
        const parts = [];
        let last = 0;
        for (const m of node.value.matchAll(MEASURED)) {
          if (m.index > last) {
            parts.push({ type: 'text', value: node.value.slice(last, m.index) });
          }
          parts.push({
            type: 'html',
            value: `<span class="measured">${m[0]}</span>`,
          });
          last = m.index + m[0].length;
        }
        if (last < node.value.length) {
          parts.push({ type: 'text', value: node.value.slice(last) });
        }
        if (parts.length > 0) {
          node.type = 'root';
          delete node.value;
          node.children = parts;
        }
        return;
      }
      if (node.children) {
        for (const child of node.children) {
          visit(child);
        }
      }
    };
    visit(tree);
  };
}
