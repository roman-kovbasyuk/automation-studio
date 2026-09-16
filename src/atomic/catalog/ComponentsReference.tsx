import { useState } from 'react'
import { Divider, Inline, Stack, Text } from '../atoms'
import { Accordion, Avatar, AvatarGroup, AvatarGroupCompact, Badge, Banner, Button, ButtonGroup, ColorPicker, CommandMenu, CompactButton, DigitInput, DotStepper, FancyButton, Hint, Kbd, Label, Notification, TabMenuVertical, TextField, VerticalStepper } from '../components'
import { CatalogSection } from './CatalogSection'

export function ComponentsReference() {
  const [color, setColor] = useState('#72b8ff'), [code, setCode] = useState('2048'), [step, setStep] = useState(1)
  return <>
    <CatalogSection id="component-button-group" title="Button group"><ButtonGroup><Button variant="primary">Save</Button><Button>Save as draft</Button><CompactButton iconOnly icon="more" aria-label="More save actions" /></ButtonGroup></CatalogSection>
    <CatalogSection id="component-compact-button" title="Compact button"><Inline gap={3}><CompactButton icon="edit">Edit</CompactButton><CompactButton iconOnly icon="settings" aria-label="Settings" /></Inline></CatalogSection>
    <CatalogSection id="component-fancy-button" title="Fancy button"><FancyButton variant="primary" subtitle="Opens the workspace" icon="arrowRight" iconPosition="end">Continue</FancyButton></CatalogSection>
    <CatalogSection id="component-avatar" title="Avatar"><Inline gap={3}><Avatar name="Mira Chen" status="online" /><Avatar name="Jonas Weber" size="large" /><Avatar name="No image" status="offline" /></Inline></CatalogSection>
    <CatalogSection id="component-avatar-group" title="Avatar group"><AvatarGroup label="Project members" items={[{ name: 'Mira Chen' }, { name: 'Jonas Weber' }, { name: 'Alex Kim' }, { name: 'Sam Lee' }]} max={3} /></CatalogSection>
    <CatalogSection id="component-avatar-group-compact" title="Avatar group compact"><AvatarGroupCompact label="Reviewers" items={[{ name: 'Mira Chen' }, { name: 'Jonas Weber' }, { name: 'Alex Kim' }]} /></CatalogSection>
    <CatalogSection id="component-badge" title="Badge"><Inline gap={2}><Badge>Draft</Badge><Badge tone="accent" icon="clock">In review</Badge><Badge tone="success" icon="check">Approved</Badge></Inline></CatalogSection>
    <CatalogSection id="component-banner" title="Banner"><Banner title="Scheduled maintenance" description="The workspace will be read-only for five minutes." tone="warning" action={<Button size="compact">Details</Button>} /></CatalogSection>
    <CatalogSection id="component-divider" title="Divider"><Stack gap={3}><Text>Before</Text><Divider /><Text>After</Text></Stack></CatalogSection>
    <CatalogSection id="component-kbd" title="Kbd"><Inline gap={2}><Kbd>⌘</Kbd><Kbd>K</Kbd><Text variant="small" tone="secondary">opens quick search</Text></Inline></CatalogSection>
    <CatalogSection id="component-notification" title="Notification"><Notification title="Export complete" description="Your files are ready to download." tone="success" actions={<Button size="compact">Download</Button>} /></CatalogSection>
    <CatalogSection id="component-color-picker" title="Color picker"><ColorPicker label="Accent color" value={color} onChange={setColor} /></CatalogSection>
    <CatalogSection id="component-digit-input" title="Digit input"><DigitInput label="Verification code" value={code} onChange={setCode} /></CatalogSection>
    <CatalogSection id="component-hint" title="Hint"><Stack gap={2}><TextField id="catalog-slug" label="Workspace slug" defaultValue="nordic-spring" /><Hint>Use lowercase letters and hyphens.</Hint></Stack></CatalogSection>
    <CatalogSection id="component-label" title="Label"><Label required hint="Optional help text">Project name</Label></CatalogSection>
    <CatalogSection id="component-accordion" title="Accordion"><Accordion label="FAQ" items={[{ id: 'one', title: 'What is shared?', content: 'Tokens and primitives are shared across every screen.', defaultOpen: true }, { id: 'two', title: 'Can I customize it?', content: 'Use named variants and composition props.' }]} /></CatalogSection>
    <CatalogSection id="component-tab-menu-vertical" title="Tab menu vertical"><TabMenuVertical label="Settings" items={[{ id: 'general', label: 'General', content: <Text>General settings content.</Text> }, { id: 'members', label: 'Members', content: <Text>Members settings content.</Text> }]} /></CatalogSection>
    <CatalogSection id="component-dot-stepper" title="Dot stepper"><DotStepper label="Checkout progress" steps={['Cart', 'Details', 'Payment', 'Done']} current={step} onChange={setStep} /></CatalogSection>
    <CatalogSection id="component-vertical-stepper" title="Vertical stepper"><VerticalStepper label="Onboarding" current="review" steps={[{ id: 'account', label: 'Create account', complete: true }, { id: 'review', label: 'Review details', description: 'Check your information' }, { id: 'finish', label: 'Finish setup' }]} /></CatalogSection>
    <CatalogSection id="component-command-menu" title="Command menu"><CommandMenu label="Open command menu" items={[{ id: 'new', label: 'New project', icon: 'plus' }, { id: 'settings', label: 'Open settings', icon: 'settings' }]} onSelect={() => undefined} /></CatalogSection>
  </>
}
