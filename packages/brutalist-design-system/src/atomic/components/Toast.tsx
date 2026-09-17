import { Icon } from '../atoms'
import { Alert, type AlertProps } from './Alert'
export type ToastProps = Omit<AlertProps, 'announce' | 'action'> & { onDismiss: () => void }
export function Toast({ onDismiss, ...props }: ToastProps) { return <Alert {...props} className={`c-toast ${props.className ?? ''}`} announce action={<button type="button" className="c-toast__dismiss" aria-label="Dismiss notification" onClick={onDismiss}><Icon name="close" size="small" /></button>} /> }
