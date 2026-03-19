import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import Container from '#/components/Container'
import { userQueryOptions } from '#/queries/userQueries'

export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  const { getToken } = useAuth()
  const { data: user } = useSuspenseQuery(userQueryOptions(getToken))

  return (
    <Container title="Dashboard" requireAuth>
      <div>{user.email}</div>
    </Container>
  )
}
