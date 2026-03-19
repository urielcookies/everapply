import { createFileRoute } from '@tanstack/react-router'
import Container from '#/components/Container'

export const Route = createFileRoute('/_authenticated/settings')({
  component: Settings,
})

function Settings() {
  return <Container title="Settings" />
}
