export const useCopyToClipboard = (value?: string | number | Array<string | number> | undefined) => {
  if (typeof value === 'string' || typeof value === 'number') {
    navigator.clipboard.writeText(value.toString());
  } else if (Array.isArray(value)) {
    navigator.clipboard.writeText(value.join(', '));
  } else {
    console.warn('Unsupported value type for copying to clipboard');
  }
}