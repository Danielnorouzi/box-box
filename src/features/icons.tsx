// Filled glyphs, 24×24, currentColor.
type P = { title?: string };
const svg = (path: React.ReactNode) => ({ title }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
    {title && <title>{title}</title>}
    {path}
  </svg>
);
export const IconPause = svg(<path d="M7 4.5h3.2c.4 0 .8.4.8.8v13.4c0 .4-.4.8-.8.8H7a.8.8 0 0 1-.8-.8V5.3c0-.4.4-.8.8-.8Zm6.8 0H17c.4 0 .8.4.8.8v13.4c0 .4-.4.8-.8.8h-3.2a.8.8 0 0 1-.8-.8V5.3c0-.4.4-.8.8-.8Z" />);
export const IconPlay = svg(<path d="M8.2 4.3c-.7-.4-1.7.1-1.7 1v13.4c0 .9 1 1.4 1.7 1l10.7-6.7a1.2 1.2 0 0 0 0-2L8.2 4.3Z" />);
export const IconFlag = svg(<path d="M5 3.2c.5 0 .9.4.9.9v.5c2.6-1.3 5.2.5 7.4.5 1.7 0 3-.6 4-1.1.6-.3 1.3.1 1.3.8v8.8c0 .4-.2.7-.5.8-1.2.6-2.8 1.3-4.8 1.3-2.5 0-4.9-1.8-7.4-.5v5.7a.9.9 0 1 1-1.8 0V4.1c0-.5.4-.9.9-.9Z" />);
export const IconStop = svg(<path d="M12 2.8a9.2 9.2 0 1 1 0 18.4 9.2 9.2 0 0 1 0-18.4Zm-3.3 5.9a1 1 0 0 0-1 1v4.6a1 1 0 0 0 1 1h6.6a1 1 0 0 0 1-1V9.7a1 1 0 0 0-1-1H8.7Z" />);
export const IconBack = svg(<path d="M10.6 5.3a1 1 0 0 1 0 1.4L6.3 11H19a1 1 0 1 1 0 2H6.3l4.3 4.3a1 1 0 1 1-1.4 1.4l-6-6a1 1 0 0 1 0-1.4l6-6a1 1 0 0 1 1.4 0Z" />);
