import { createFileRoute } from '@tanstack/react-router'
import Container from '#/components/Container'

export const Route = createFileRoute('/preferences')({
  component: Preferences,
})

function Preferences() {
  return (
    <Container title="Preferences" requireAuth />
  )
}
