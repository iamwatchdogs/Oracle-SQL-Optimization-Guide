/**
 * Force annotation: wrap measured values in presentation markup so plan/SQL
 * prose carries mono tabular figures. Does not alter wording — only spans.
 *
 * `\d{1,3}` on the thousands group, not `\d{2,3}`. The longer form required two
 * or more leading digits, so `12,000` was annotated and `1,000` was not — the
 * same quantity, formatted the way it happened to appear, got two different
 * treatments. Across the corpus that left 15 real row counts (`1,000`, `9,628`,
 * `9,883`, `5,186`, `1,233`) in serif while their six-figure neighbours were in
 * mono. The shorter form introduces no false positives on this content.
 */
const MEASURED =
  /((?:E|A)-Rows=[\d.]+[KM]?|\b\d+(?:\.\d+)?\s*(?:ms|seconds?|x)\b|\b\d{1,3}(?:,\d{3})+\b)/giu;
const CITATION_LABEL = /^(?:S\d{1,3}|T-\d{1,3}|P\d{1,3}|W\d{1,3})$/u;

function citationLabel(node) {
  return (node.children ?? [])
    .map((child) => ('value' in child && typeof child.value === 'string' ? child.value : ''))
    .join('')
    .trim();
}

export function remarkCitations() {
  return (tree) => {
    const visit = (node) => {
      if (node.type === 'link' && CITATION_LABEL.test(citationLabel(node))) {
        node.data = {
          ...node.data,
          hProperties: {
            ...node.data?.hProperties,
            className: 'citation',
          },
        };
      }
      node.children?.forEach(visit);
    };

    visit(tree);
  };
}

export function remarkMeasuredValues() {
  return (tree) => {
    const visit = (node) => {
      /*
       * Headings are skipped outright, not just left alone today.
       *
       * `rehype-slug` builds a heading's `id` from `toString(node)`, and for an
       * `html` node `toString` returns the RAW SOURCE — so an injected
       * `<span class="measured">12,000</span>` would go into the slug, producing
       * an id full of angle brackets and breaking the deep link the section TOC
       * depends on. No shipped heading happens to contain a measured value, so
       * this is latent rather than live, but the guard is what keeps it that way.
       */
      if (node.type === 'heading') {
        return;
      }
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
