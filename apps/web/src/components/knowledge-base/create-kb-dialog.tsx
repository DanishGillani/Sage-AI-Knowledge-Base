'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createKnowledgeBase } from '@/lib/api/knowledge-bases'

interface CreateKbDialogProps {
  open: boolean
  onClose: () => void
}

export function CreateKbDialog({ open, onClose }: CreateKbDialogProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [nameError, setNameError] = useState('')

  const mutation = useMutation({
    mutationFn: () => createKnowledgeBase({ name: name.trim(), description: description.trim() || undefined }),
    onSuccess: (result) => {
      if (!result.success) {
        if (result.error.code === 'VALIDATION_ERROR') {
          setNameError(result.error.message)
        }
        return
      }
      void queryClient.invalidateQueries({ queryKey: ['knowledge-bases'] })
      handleClose()
      router.push(`/dashboard/knowledge-bases/${result.data.id}`)
    },
  })

  function handleClose() {
    setName('')
    setDescription('')
    setNameError('')
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setNameError('Name is required')
      return
    }
    setNameError('')
    mutation.mutate()
  }

  return (
    <Dialog open={open} onClose={handleClose} title="New knowledge base">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="kb-name" className="text-sm font-medium text-foreground">
            Name <span className="text-destructive">*</span>
          </label>
          <Input
            id="kb-name"
            placeholder="e.g. Product Docs"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={nameError}
            maxLength={100}
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="kb-desc" className="text-sm font-medium text-foreground">
            Description
          </label>
          <Textarea
            id="kb-desc"
            placeholder="What will this knowledge base contain?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">{description.length}/500</p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending} disabled={!name.trim()}>
            Create
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
