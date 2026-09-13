import { Icon, Inline, Text, Surface, Stack, Heading } from '../atoms'
import type { ReactNode } from 'react'
import './loading.css'
export type SpinnerProps = { label: string }
export function Spinner({ label }: SpinnerProps) { return <Inline gap={2} className="c-spinner" role="status" aria-label={label}><Icon name="loading" /><Text variant="small">{label}</Text></Inline> }
export type SkeletonProps = { label?: string; lines?: number }
export function Skeleton({ label = 'Loading', lines = 3 }: SkeletonProps) { return <Stack gap={3} className="c-skeleton" role="status" aria-label={label}>{Array.from({ length: Math.min(10, Math.max(1, Math.floor(lines) || 1)) }, (_, i) => <span key={i} aria-hidden="true" />)}</Stack> }
export type EmptyStateProps = { title: string; description?: string; action?: ReactNode }
export function EmptyState({ title, description, action }: EmptyStateProps) { return <Surface padding={8} className="c-empty-state"><Stack gap={3}><Icon name="folder" size="large" /><Heading level={3} variant="h5">{title}</Heading>{description && <Text tone="secondary">{description}</Text>}{action}</Stack></Surface> }
