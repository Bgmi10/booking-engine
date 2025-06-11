import { type EmailBlock } from '../../types';

const convertStyleObjectToString = (styles: Record<string, any>): string => {
  return Object.entries(styles)
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
};

export const convertToHtml = (blocks: EmailBlock[]): string => {
  return blocks
    .map((block) => {
      const styles = convertStyleObjectToString(block.styles);

      switch (block.type) {
        case 'text':
          return `<div style="${styles}">${block.content.text || ''}</div>`;

        case 'image':
          const imgHtml = `<img src="${block.content.src || ''}" alt="${
            block.content.alt || ''
          }" style="${styles}" />`;
          return block.content.link
            ? `<a href="${block.content.link}" target="_blank" rel="noopener noreferrer">${imgHtml}</a>`
            : imgHtml;

        case 'button':
          return `<a href="${
            block.content.url || '#'
          }" target="_blank" rel="noopener noreferrer" style="display: inline-block; text-decoration: none; ${styles}">${
            block.content.text || 'Click me'
          }</a>`;

        case 'divider':
          return `<hr style="${styles}" />`;

        case 'spacer':
          return `<div style="${styles}"></div>`;

        case 'variable':
          const variableName = block.content.variableName;
          const fallback = block.content.fallback;
          if (!variableName) return '';

          const variableContent = fallback
            ? `{{#if ${variableName}}}{{${variableName}}}{{else}}${fallback}{{/if}}`
            : `{{${variableName}}}`;

          return `<span style="${styles}">${variableContent}</span>`;

        default:
          return '';
      }
    })
    .join('\n');
}; 