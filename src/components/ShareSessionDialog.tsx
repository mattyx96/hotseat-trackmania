import { useState } from 'react';
import { Button, Dialog, Input, useToast } from 'nebula-ds-react-library';
import { ClipboardDocumentIcon, CloudArrowUpIcon } from '@heroicons/react/24/solid';
import { createCloudSession, updateCloudSession } from '../lib/cloud';
import { useApp } from '../state/appContext';
import type { Session } from '../types';

interface ShareSessionDialogProps {
  session: Session;
}

export function ShareSessionDialog({ session }: ShareSessionDialogProps) {
  const { players, attachShareCode } = useApp();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<string | null>(session.shareCode);
  const [busy, setBusy] = useState(false);

  const link = code ? `${window.location.origin}/?session=${code}` : '';

  const handleOpenChange = (next: boolean) => {
    if (next) setCode(session.shareCode);
    setOpen(next);
  };

  const share = async () => {
    setBusy(true);
    try {
      if (code) {
        await updateCloudSession(code, session, players);
        toast.success({ title: 'Saved to cloud' });
      } else {
        const created = await createCloudSession(session, players);
        attachShareCode(session.id, created);
        setCode(created);
        toast.success({ title: 'Shared to cloud', description: `Code ${created}` });
      }
    } catch (error) {
      toast.error({
        title: 'Cloud save failed',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success({ title: 'Link copied' });
    } catch {
      toast.error({ title: 'Could not copy the link' });
    }
  };

  return (
    <Dialog
      text={session.shareCode ? 'Cloud' : 'Share'}
      leftIcon={<CloudArrowUpIcon />}
      variant={session.shareCode ? 'standard' : 'outlined'}
      size="S"
      rounded="R"
      title="Cloud save"
      description={
        code
          ? 'Anyone with this link can load the session — and overwrite it.'
          : 'Create a share code to save this session online.'
      }
      open={open}
      onOpenChange={handleOpenChange}
    >
      <div className="hs-fields">
        {code ? (
          <>
            <Input
              label="Share link"
              value={link}
              readOnly
              fullWidth
              onFocus={(event) => event.currentTarget.select()}
            />
            <div className="hs-row hs-row--end">
              <Button
                variant="standard"
                size="M"
                rounded="R"
                leftIcon={<ClipboardDocumentIcon />}
                text="Copy link"
                onClick={copy}
              />
              <Button variant="filled" size="M" rounded="R" text="Save now" disabled={busy} onClick={share} />
            </div>
          </>
        ) : (
          <div className="hs-row hs-row--end">
            <Button variant="filled" size="M" rounded="R" text="Create share link" disabled={busy} onClick={share} />
          </div>
        )}
      </div>
    </Dialog>
  );
}
