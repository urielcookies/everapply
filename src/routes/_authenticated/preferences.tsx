import { createFileRoute } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { isEqual } from 'lodash'
import { useAuth } from '@clerk/clerk-react'
import { MapPin, DollarSign, ShieldAlert, Wifi, Target } from 'lucide-react'
import { toast } from 'sonner'
import { useUserStore } from '#/stores/useUserStore'
import { everApplyApi } from '#/lib/api'
import Container from '#/components/Container'
import { Switch } from '#/components/ui/switch'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { Button } from '#/components/ui/button'
import { Slider } from '#/components/ui/slider'

export const Route = createFileRoute('/_authenticated/preferences')({
  component: Preferences,
})

type RemoteType = 'remote' | 'hybrid' | 'onsite'

const RADIUS_OPTIONS = [5, 10, 15, 25, 50, 100] as const
const SALARY_MAX = 300000

function formatSalary(val: number): string {
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`
  return `$${Math.round(val / 1000)}k`
}

function salaryRangeLabel(range: [number, number]): string {
  const [min, max] = range
  if (min === 0 && max === SALARY_MAX) return 'Any'
  if (min === 0) return `Up to ${formatSalary(max)}`
  if (max === SALARY_MAX) return `${formatSalary(min)}+`
  return `${formatSalary(min)} – ${formatSalary(max)}`
}

const preferencesSchema = z.object({
  remote_type: z.enum(['remote', 'hybrid', 'onsite']),
  preferred_location: z.string().optional(),
  radius_miles: z.number().optional(),
  salary_min: z.number().min(0).optional(),
  salary_max: z.number().min(0).optional(),
  salary_enabled: z.boolean(),
  exclude_clearance: z.boolean(),
  min_match_score: z.number().min(0).max(100).nullable().optional(),
})

type Preferences = z.infer<typeof preferencesSchema>

function getDefaults(prefs: Record<string, unknown> | null): Preferences {
  return {
    remote_type: (prefs?.remote_type as RemoteType) ?? 'remote',
    preferred_location: (prefs?.preferred_location as string) ?? '',
    radius_miles: (prefs?.radius_miles as number) ?? 25,
    salary_min: (prefs?.salary_min as number) ?? undefined,
    salary_max: (prefs?.salary_max as number) ?? undefined,
    salary_enabled: (prefs?.salary_enabled as boolean) ?? false,
    exclude_clearance: (prefs?.exclude_clearance as boolean) ?? false,
    min_match_score: (prefs?.min_match_score as number | null) ?? null,
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

  type PreferencesPayload = Omit<Preferences, 'salary_min' | 'salary_max'> & {
    salary_min?: number | null
    salary_max?: number | null
  }

  const { mutateAsync: savePreferences } = useMutation({
    mutationFn: (payload: PreferencesPayload) =>
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
        salary_min: result.data.salary_min ?? null,
        salary_max: result.data.salary_max ?? null,
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
          description="Set your expected compensation range. Toggle the filter to apply it when browsing matches."
        >
          <form.Field name="salary_enabled">
            {(enabledField) => (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">
                      Enable salary filter
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {enabledField.state.value
                        ? 'Only show jobs within your salary range'
                        : 'Salary range will not be used as a filter'}
                    </span>
                  </div>
                  <Switch
                    checked={enabledField.state.value}
                    onCheckedChange={(val) => { enabledField.handleChange(val); triggerSave() }}
                  />
                </div>

                {enabledField.state.value && (
                  <form.Field name="salary_min">
                    {(minField) => (
                      <form.Field name="salary_max">
                        {(maxField) => {
                          const range: [number, number] = [
                            minField.state.value ?? 0,
                            maxField.state.value ?? SALARY_MAX,
                          ]
                          return (
                            <div className="flex flex-col gap-2 px-1">
                              <span className="font-mono text-xs font-semibold text-foreground">
                                {salaryRangeLabel(range)}
                              </span>
                              <Slider
                                value={range}
                                min={0}
                                max={SALARY_MAX}
                                step={5000}
                                onValueChange={(val) => {
                                  const [min, max] = val as [number, number]
                                  minField.handleChange(min === 0 ? undefined : min)
                                  maxField.handleChange(max === SALARY_MAX ? undefined : max)
                                }}
                                onValueCommitted={() => triggerSave()}
                              />
                            </div>
                          )
                        }}
                      </form.Field>
                    )}
                  </form.Field>
                )}
              </div>
            )}
          </form.Field>
        </Section>

        {/* Min. Match Score */}
        <Section
          icon={<Target size={14} />}
          title="Min. match score"
          description="Hide jobs below this score on your dashboard. Disable to show all matches."
        >
          <form.Field name="min_match_score">
            {(field) => (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">
                      Apply minimum match score
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {field.state.value != null
                        ? `Hiding jobs below ${field.state.value}%`
                        : 'All matches are visible regardless of score'}
                    </span>
                  </div>
                  <Switch
                    checked={field.state.value != null}
                    onCheckedChange={(val) => {
                      field.handleChange(val ? 70 : null)
                      triggerSave()
                    }}
                  />
                </div>

                {field.state.value != null && (
                  <div className="flex flex-col gap-2 px-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {field.state.value}%
                      </span>
                    </div>
                    <Slider
                      value={[field.state.value]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={(val) => {
                        const v = typeof val === 'number' ? val : val[0]
                        field.handleChange(v)
                      }}
                      onValueCommitted={() => triggerSave()}
                    />
                  </div>
                )}
              </div>
            )}
          </form.Field>
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
