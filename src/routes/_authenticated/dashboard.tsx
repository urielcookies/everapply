import { createFileRoute } from '@tanstack/react-router'
import Container from '#/components/Container'
import { useUserStore } from '#/stores/useUserStore'

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  const { user } = useUserStore();
  console.log('user-->>', user);
  return (
    <Container title="Dashboard">
      <div>{user.email}</div>
    </Container>
  )
}
