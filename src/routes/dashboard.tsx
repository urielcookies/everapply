import { createFileRoute } from '@tanstack/react-router'
import Container from '#/components/Container'

export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  return (
    <Container title="Dashboard" requireAuth>
      <div>Hello</div>
    </Container>
  )
}
