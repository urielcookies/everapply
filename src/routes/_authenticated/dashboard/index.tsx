import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import Container from '#/components/Container'
import { useUserStore } from '#/stores/useUserStore'

export const Route = createFileRoute('/_authenticated/dashboard/')({
  component: Dashboard,
})

function Dashboard() {
  const { user } = useUserStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user.resume_url) {
      navigate({ to: '/onboarding' })
    }
  }, [user.resume_url])

  return (
    <Container title="Dashboard">
      <div>{user.email}</div>
    </Container>
  )
}
