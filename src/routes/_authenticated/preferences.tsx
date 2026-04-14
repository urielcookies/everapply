import { createFileRoute } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { isEqual } from 'lodash'
import { useAuth } from '@clerk/clerk-react'
import { MapPin, DollarSign, ShieldAlert, Wifi } from 'lucide-react'
import { toast } from 'sonner'
import { useUserStore } from '#/stores/useUserStore'
import { everApplyApi } from '#/lib/api'
import Container from '#/components/Container'
import { Switch } from '#/components/ui/switch'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/_authenticated/preferences')({
  component: Preferences,
})

type RemoteType = 'remote' | 'hybrid' | 'onsite'

const RADIUS_OPTIONS = [5, 10, 15, 25, 50, 100] as const

const preferencesSchema = z.object({
  remote_type: z.enum(['remote', 'hybrid', 'onsite']),
  preferred_location: z.string().optional(),
  radius_miles: z.number().optional(),
  salary_min: z.number().min(0).optional(),
  salary_max: z.number().min(0).optional(),
  exclude_clearance: z.boolean(),
})

type Preferences = z.infer<typeof preferencesSchema>

function getDefaults(prefs: Record<string, unknown> | null): Preferences {
  return {
    remote_type: (prefs?.remote_type as RemoteType) ?? 'remote',
    preferred_location: (prefs?.preferred_location as string) ?? '',
    radius_miles: (prefs?.radius_miles as number) ?? 25,
    salary_min: (prefs?.salary_min as number) ?? undefined,
    salary_max: (prefs?.salary_max as number) ?? undefined,
    exclude_clearance: (prefs?.exclude_clearance as boolean) ?? false,
  }
}

interface SectionProps {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
}

function Section({ icon, title, description, children }: SectionProps) {
  return (
    <div className="grid grid-cols-1 gap-6 border-b border-border pb-8 last:border-0 last:pb-0 sm:grid-cols-[1fr_1.6fr]">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </span>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground pl-9">
          {description}
        </p>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  )
}

function Preferences() {
  const { user, fetchUser } = useUserStore()
  const { getToken } = useAuth()

  const { mutateAsync: savePreferences } = useMutation({
    mutationFn: (payload: Preferences) =>
      everApplyApi('/users/preferences', getToken, {
        method: 'PUT',
        data: payload,
      }),
    onSuccess: async () => {
      await fetchUser(getToken)
      toast.success('Preferences saved')
    },
    onError: () => {
      toast.error('Failed to save preferences')
    },
  })

  const form = useForm({
    defaultValues: getDefaults(user.preferences),
    onSubmit: async ({ value }) => {
      const result = preferencesSchema.safeParse(value)
      if (!result.success) return

      await savePreferences({
        ...result.data,
        preferred_location: result.data.preferred_location || undefined,
        salary_min: result.data.salary_min || undefined,
        salary_max: result.data.salary_max || undefined,
        radius_miles: isEqual(result.data.remote_type, 'remote')
          ? undefined
          : result.data.radius_miles,
      })
    },
  })

  const triggerSave = () => form.handleSubmit()

  return (
    <Container
      title="Preferences"
      description="Control how EverApply finds and scores jobs for you."
    >
      <div className="flex flex-col gap-8">
        {/* Work Type */}
        <Section
          icon={<Wifi size={14} />}
          title="Work type"
          description="The type of work arrangement you're looking for."
        >
          <form.Field name="remote_type">
            {(field) => (
              <div className="flex flex-col gap-2">
                <ToggleGroup
                  value={[field.state.value]}
                  onValueChange={(val: string[]) => {
                    const next = val.find((v) => v !== field.state.value)
                    if (next) { field.handleChange(next as RemoteType); triggerSave() }
                  }}
                  className="justify-start gap-2"
                >
                  {(['remote', 'hybrid', 'onsite'] as RemoteType[]).map((type) => (
                    <ToggleGroupItem
                      key={type}
                      value={type}
                      className="rounded-lg border border-border px-4 py-2 text-xs font-medium capitalize data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                    >
                      {isEqual(type, 'onsite') ? 'On-site' : type.charAt(0).toUpperCase() + type.slice(1)}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            )}
          </form.Field>
        </Section>

        {/* Location */}
        <Section
          icon={<MapPin size={14} />}
          title="Location"
          description="Your preferred city or region. Radius only applies for hybrid and on-site roles."
        >
          <form.Field name="preferred_location">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Preferred location
                </Label>
                <Input
                  placeholder="e.g. New York, NY"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={() => { field.handleBlur(); triggerSave() }}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="remote_type">
            {(remoteField) =>
              !isEqual(remoteField.state.value, 'remote') ? (
                <form.Field name="radius_miles">
                  {(field) => (
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs font-medium text-muted-foreground">
                        Search radius
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {RADIUS_OPTIONS.map((r) => (
                          <Button
                            key={r}
                            variant="outline"
                            size="sm"
                            onClick={() => { field.handleChange(r); triggerSave() }}
                            className={isEqual(field.state.value, r) ? 'border-primary bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary' : ''}
                          >
                            {r} mi
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </form.Field>
              ) : null
            }
          </form.Field>
        </Section>

        {/* Salary */}
        <Section
          icon={<DollarSign size={14} />}
          title="Salary range"
          description="Only show jobs within your expected compensation range. Leave blank to see all."
        >
          <div className="grid grid-cols-2 gap-3">
            <form.Field name="salary_min">
              {(field) => (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Minimum
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="number"
                      placeholder="80,000"
                      className="pl-6"
                      value={field.state.value ?? ''}
                      onChange={(e) =>
                        field.handleChange(
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                      onBlur={triggerSave}
                    />
                  </div>
                </div>
              )}
            </form.Field>

            <form.Field name="salary_max">
              {(field) => (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Maximum
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="number"
                      placeholder="150,000"
                      className="pl-6"
                      value={field.state.value ?? ''}
                      onChange={(e) =>
                        field.handleChange(
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                      onBlur={triggerSave}
                    />
                  </div>
                </div>
              )}
            </form.Field>
          </div>
        </Section>

        {/* Security Clearance */}
        <Section
          icon={<ShieldAlert size={14} />}
          title="Security clearance"
          description="Toggle on to exclude jobs that require a government security clearance."
        >
          <form.Field name="exclude_clearance">
            {(field) => (
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3.5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">
                    Exclude clearance-required jobs
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {field.state.value
                      ? 'Jobs requiring clearance are hidden'
                      : 'All jobs are visible including clearance roles'}
                  </span>
                </div>
                <Switch
                  checked={field.state.value}
                  onCheckedChange={(val) => { field.handleChange(val); triggerSave() }}
                />
              </div>
            )}
          </form.Field>
        </Section>

      </div>
    </Container>
  )
}
