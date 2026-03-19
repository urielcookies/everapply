import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { isEqual } from 'lodash'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { useAuth } from '@clerk/clerk-react'
import { useUserStore } from '#/stores/useUserStore'
import { everApplyApi } from '#/lib/api'
import { Progress } from '#/components/ui/progress'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Slider } from '#/components/ui/slider'
import { Switch } from '#/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { Upload, FileText, X } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/onboarding')({
  component: Onboarding,
})

const preferencesSchema = z.object({
  work_type: z.array(z.string()).min(1, 'Select at least one work type'),
  location: z.string().min(1, 'Location is required'),
  min_score: z.number().min(0).max(100),
  security_clearance: z.boolean(),
})

type Preferences = z.infer<typeof preferencesSchema>

function Onboarding() {
  const { user, fetchUser } = useUserStore()
  const { getToken } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user.resume_url) {
      navigate({ to: '/dashboard' })
    }
  }, [user.resume_url])

  const [step, setStep] = useState<1 | 2>(1)
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFile = useCallback((file: File) => {
    if (!isEqual(file.type, 'application/pdf')) {
      setUploadError('Only PDF files are accepted.')
      return
    }
    setUploadError(null)
    setSelectedFile(file)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return
    setIsUploading(true)
    setUploadError(null)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      const token = await getToken()
      await everApplyApi('/users/resume', getToken, {
        method: 'POST',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      setStep(2)
    } catch {
      setUploadError('Failed to upload resume. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }, [selectedFile, getToken])

  const form = useForm<Preferences>({
    defaultValues: {
      work_type: [],
      location: '',
      min_score: 70,
      security_clearance: false,
    },
    onSubmit: async ({ value }) => {
      const result = preferencesSchema.safeParse(value)
      if (!result.success) return
      await everApplyApi('/users/preferences', getToken, {
        method: 'PUT',
        data: result.data,
      })
      await fetchUser(getToken)
      navigate({ to: '/dashboard' })
    },
  })

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
          <span>Step {step} of 2</span>
          <span>{isEqual(step, 1) ? 'Resume Upload' : 'Preferences'}</span>
        </div>
        <Progress value={isEqual(step, 1) ? 50 : 100} />
      </div>

      {isEqual(step, 1) && (
        <Card>
          <CardHeader>
            <CardTitle>Upload your resume</CardTitle>
            <CardDescription>
              We'll parse your resume to match you with the best job opportunities.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/40'}`}
              onClick={() => document.getElementById('resume-input')?.click()}
            >
              <input
                id="resume-input"
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileInput}
              />
              {selectedFile ? (
                <>
                  <FileText size={32} className="text-primary" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{selectedFile.name}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedFile(null) }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(0)} KB
                  </span>
                </>
              ) : (
                <>
                  <Upload size={32} className="text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Drag & drop your resume here
                    </p>
                    <p className="text-xs text-muted-foreground">or click to browse — PDF only</p>
                  </div>
                </>
              )}
            </div>

            {uploadError && (
              <p className="text-sm text-destructive">{uploadError}</p>
            )}

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="w-full"
            >
              {isUploading ? 'Uploading...' : 'Upload & Continue'}
            </Button>
          </CardContent>
        </Card>
      )}

      {isEqual(step, 2) && (
        <Card>
          <CardHeader>
            <CardTitle>Set your preferences</CardTitle>
            <CardDescription>
              Help us find jobs that match exactly what you're looking for.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                form.handleSubmit()
              }}
              className="flex flex-col gap-6"
            >
              {/* Work Type */}
              <form.Field name="work_type">
                {(field) => (
                  <div className="flex flex-col gap-2">
                    <Label>Work type</Label>
                    <ToggleGroup
                      type="multiple"
                      value={field.state.value}
                      onValueChange={(val) => field.handleChange(val)}
                      className="justify-start"
                    >
                      <ToggleGroupItem value="remote">Remote</ToggleGroupItem>
                      <ToggleGroupItem value="hybrid">Hybrid</ToggleGroupItem>
                      <ToggleGroupItem value="onsite">On-site</ToggleGroupItem>
                    </ToggleGroup>
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </form.Field>

              {/* Location */}
              <form.Field
                name="location"
                validators={{
                  onBlur: ({ value }) =>
                    isEqual(value.trim().length, 0) ? 'Location is required' : undefined,
                }}
              >
                {(field) => (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="location">Preferred location</Label>
                    <Input
                      id="location"
                      placeholder="e.g. New York, NY or Remote"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </form.Field>

              {/* Min Score */}
              <form.Field name="min_score">
                {(field) => (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <Label>Minimum match score</Label>
                      <span className="text-sm font-medium text-foreground">
                        {field.state.value}%
                      </span>
                    </div>
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      value={[field.state.value]}
                      onValueChange={([val]) => field.handleChange(val)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Only show jobs with a match score above this threshold.
                    </p>
                  </div>
                )}
              </form.Field>

              {/* Security Clearance */}
              <form.Field name="security_clearance">
                {(field) => (
                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex flex-col gap-0.5">
                      <Label htmlFor="clearance" className="text-sm font-medium">
                        Security clearance
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Include jobs that require a security clearance.
                      </p>
                    </div>
                    <Switch
                      id="clearance"
                      checked={field.state.value}
                      onCheckedChange={(val) => field.handleChange(val)}
                    />
                  </div>
                )}
              </form.Field>

              <form.Subscribe selector={(s) => s.isSubmitting}>
                {(isSubmitting) => (
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? 'Saving...' : 'Save & Go to Dashboard'}
                  </Button>
                )}
              </form.Subscribe>
            </form>
          </CardContent>
        </Card>
      )}
    </main>
  )
}
