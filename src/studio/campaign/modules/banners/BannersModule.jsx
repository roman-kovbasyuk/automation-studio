import { useState } from 'react'
import { BannersView } from './BannersView.jsx'
import { ReviewView } from '../review/ReviewView.jsx'

export default function BannersModule({ port }) {
  const [reviewMode, setReviewMode] = useState(false)
  const reviewPort = port.reviewPort
  const showingReview = Boolean(reviewPort && (reviewMode || reviewPort.input.phase !== 'prepare'))
  if (showingReview) return <ReviewView {...reviewPort} expectedInputKey={reviewPort.inputKey} />
  return <BannersView input={port.input} inputKey={port.inputKey} assets={port.assets}
    pending={port.operation.kind === 'running' ? port.operation.actionId : ''} readOnly={!port.access.canEdit}
    accessReason={port.access.reason}
    onSave={port.actions.saveBatch} onPrepareReview={port.actions.prepareReview} onLoadTemplate={port.actions.loadTemplateVersion} onDirty={port.setDirty} requestedTemplate={port.requestedTemplate}
    onChooseVisuals={() => port.navigate('visuals')}
    onNext={() => { setReviewMode(true); port.navigate('banners') }} />
}
