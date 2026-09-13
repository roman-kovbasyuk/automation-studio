import { useState } from 'react'
import { Inline, Stack, Text } from '../atoms'
import { Alert, Breadcrumbs, Button, NumberStepper, Pagination, ProgressBar, ProgressRing, RangeSlider, Rating, Slider, StatusBadge, Toggle } from '../components'
import { CatalogFilters } from './CatalogFilters'
import { CatalogSection } from './CatalogSection'

export function ComponentsBatchThree() {
  const [page, setPage] = useState(2), [manyPages, setManyPages] = useState(false), [paginationDisabled, setPaginationDisabled] = useState(false)
  const [count, setCount] = useState(3), [numberDisabled, setNumberDisabled] = useState(false)
  const [intensity, setIntensity] = useState(60), [sliderDisabled, setSliderDisabled] = useState(false)
  const [age, setAge] = useState<[number, number]>([25, 55]), [rangeDisabled, setRangeDisabled] = useState(false)
  const [rating, setRating] = useState(3), [ratingDisabled, setRatingDisabled] = useState(false)
  const [progress, setProgress] = useState(68), [indeterminate, setIndeterminate] = useState(false), [showProgress, setShowProgress] = useState(true)
  const [readiness, setReadiness] = useState(82), [ringDescription, setRingDescription] = useState(true)
  const [badgeIcons, setBadgeIcons] = useState(true), [alertIcons, setAlertIcons] = useState(true), [alertDescription, setAlertDescription] = useState(true)
  return <>
    <CatalogSection id="component-breadcrumbs" title="Breadcrumbs">
      <Breadcrumbs items={[{ label: 'Atoms', href: '#color' }, { label: 'Components', href: '#components' }, { label: 'Breadcrumbs' }]} />
      <Text variant="small" tone="secondary">Linked ancestors and an unlinked current destination. These example links navigate this catalog.</Text>
    </CatalogSection>
    <CatalogSection id="component-pagination" title="Pagination" filters={<CatalogFilters label="Pagination"><Toggle label="Many pages" checked={manyPages} onChange={e => { setManyPages(e.target.checked); setPage(2) }} /><Toggle label="Disable pagination" checked={paginationDisabled} onChange={e => setPaginationDisabled(e.target.checked)} /></CatalogFilters>}>
      <Pagination page={page} pageCount={manyPages ? 100 : 3} onPageChange={setPage} disabled={paginationDisabled} />
    </CatalogSection>
    <CatalogSection id="component-number-stepper" title="Number stepper" filters={<CatalogFilters label="Number stepper"><Toggle label="Disable number stepper" checked={numberDisabled} onChange={e => setNumberDisabled(e.target.checked)} /></CatalogFilters>}>
      <NumberStepper label="Variation count" value={count} onChange={setCount} min={1} max={12} disabled={numberDisabled} instructions="1–12 variations. Type a number and press Enter or leave the field to apply it." />
    </CatalogSection>
    <CatalogSection id="component-slider" title="Slider" filters={<CatalogFilters label="Slider"><Toggle label="Disable slider" checked={sliderDisabled} onChange={e => setSliderDisabled(e.target.checked)} /></CatalogFilters>}>
      <Slider label="Campaign intensity" value={intensity} onChange={setIntensity} disabled={sliderDisabled} formatValue={value => `${value}%`} instructions="Use arrow keys for small adjustments, or Home and End for the limits." />
    </CatalogSection>
    <CatalogSection id="component-range-slider" title="Range slider" filters={<CatalogFilters label="Range slider"><Toggle label="Disable range sliders" checked={rangeDisabled} onChange={e => setRangeDisabled(e.target.checked)} /></CatalogFilters>}>
      <RangeSlider label="Audience age range" value={age} onChange={setAge} min={18} max={80} disabled={rangeDisabled} instructions="Minimum and maximum cannot cross." />
    </CatalogSection>
    <CatalogSection id="component-rating" title="Rating" filters={<CatalogFilters label="Rating"><Toggle label="Disable rating" checked={ratingDisabled} onChange={e => setRatingDisabled(e.target.checked)} /></CatalogFilters>}>
      <Rating label="Creative quality" value={rating} onChange={setRating} disabled={ratingDisabled} />
    </CatalogSection>
    <CatalogSection id="component-progress-bar" title="Progress bar" filters={<CatalogFilters label="Progress bar"><Toggle label="Indeterminate progress" checked={indeterminate} onChange={e => setIndeterminate(e.target.checked)} /><Toggle label="Progress caption" checked={showProgress} onChange={e => setShowProgress(e.target.checked)} /></CatalogFilters>}>
      <ProgressBar label="Generating assets" value={indeterminate ? undefined : progress} showValue={showProgress} />
      <Inline><Button size="compact" disabled={indeterminate || progress === 100} onClick={() => setProgress(value => Math.min(100, value + 10))}>Advance progress</Button><Button size="compact" onClick={() => setProgress(0)}>Reset progress</Button></Inline>
    </CatalogSection>
    <CatalogSection id="component-progress-ring" title="Progress ring" filters={<CatalogFilters label="Progress ring"><Toggle label="Readiness description" checked={ringDescription} onChange={e => setRingDescription(e.target.checked)} /></CatalogFilters>}>
      <ProgressRing label="Review readiness" value={readiness} description={ringDescription ? readiness === 100 ? 'All checks complete.' : 'Some checks remain.' : undefined} />
      <Inline><Button size="compact" onClick={() => setReadiness(value => value === 100 ? 82 : 100)}>{readiness === 100 ? 'Reset readiness' : 'Complete checks'}</Button></Inline>
    </CatalogSection>
    <CatalogSection id="component-alert" title="Alert" filters={<CatalogFilters label="Alert"><Toggle label="Alert icons" checked={alertIcons} onChange={e => setAlertIcons(e.target.checked)} /><Toggle label="Alert descriptions" checked={alertDescription} onChange={e => setAlertDescription(e.target.checked)} /></CatalogFilters>}>
      <Stack gap={4}>
        <Alert title="Campaign saved" description={alertDescription ? 'Nordic spring launch · just now' : undefined} tone="success" showIcon={alertIcons} />
        <Alert title="Brief needs attention" description={alertDescription ? 'Add a Norwegian CTA before export.' : undefined} tone="danger" showIcon={alertIcons} />
        <Alert title="Export delayed" description={alertDescription ? 'One format is still rendering.' : undefined} showIcon={alertIcons} />
      </Stack>
    </CatalogSection>
  </>
}
