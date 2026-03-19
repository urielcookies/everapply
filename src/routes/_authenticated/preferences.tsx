import { createFileRoute } from '@tanstack/react-router'
import Container from '#/components/Container'

export const Route = createFileRoute('/_authenticated/preferences')({
  component: Preferences,
})

function Preferences() {
  return <Container title="Preferences" />
}
