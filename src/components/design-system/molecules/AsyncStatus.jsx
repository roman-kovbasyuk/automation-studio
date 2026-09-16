/** Native status fallback; the installed package has no standalone AsyncStatus. */
export function AsyncStatus({ children }) { return <p role="status">{children}</p> }
