import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import PrivateBoundary from "~/components/PrivateBoundary";
import { captureSession, usePuterStore } from "~/lib/puter";
import { parseResume } from "~/lib/validation";
import { deleteResumeData, ownsResumePath } from "~/lib/resume-service";

function WipeApp() {
    const { auth, fs, kv } = usePuterStore();
    const [items, setItems] = useState<KVItem[]>([]);
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const running = useRef(false);
    useEffect(() => {
        let active = true;
        const assertSession = captureSession();
        void (async () => {
            try {
                const result = await kv.list('resume:*', true);
                assertSession();
                if (!active) return;
                if (!Array.isArray(result)) throw new Error('List failed');
                setItems(result.filter((item): item is KVItem => typeof item !== 'string'));
            } catch { if (active) setMessage('Could not load resume records. Reload to retry.'); }
        })();
        return () => { active = false; };
    }, [kv]);
    const deletable = items.filter(item => {
        try {
            const r = parseResume(item.value);
            return item.key === `resume:${r.id}` && ownsResumePath(r.id, r.resumePath) && ownsResumePath(r.id, r.imagePath);
        } catch { return false; }
    });
    const handleDelete = async () => {
        if (!confirmed || running.current) return;
        running.current = true; setBusy(true); setMessage('');
        const removed: string[] = [];
        let failed = 0;
        try {
            const assertSession = captureSession();
            for (const item of deletable) {
                assertSession();
                try {
                    await deleteResumeData(item.key, item.value, { assertSession, deleteFile: fs.delete, deleteKey: kv.delete });
                    removed.push(item.key);
                } catch { failed++; }
            }
            assertSession();
            setItems(previous => previous.filter(item => !removed.includes(item.key)));
            setMessage(`${removed.length} resume records deleted. ${failed} failed and remain available for retry.`);
            setConfirmed(false);
        } catch { setMessage('Session changed. Deletion stopped; sign in and reload.'); }
        finally { running.current = false; setBusy(false); }
    };
    return <main className="p-8 flex flex-col gap-4">
        <Link to="/">Back to resumes</Link>
        <h1>Delete analyzer data</h1>
        <p>Authenticated as: {auth.user?.username}</p>
        <p>{deletable.length} resume records have dedicated application folders.</p>
        <p>{items.length - deletable.length} legacy or invalid records will be retained because file ownership cannot be confirmed. Other files and keys are untouched.</p>
        <p>Partial failures retain metadata for retry. Files without a saved record may need manual cleanup in your Puter account.</p>
        {message && <p role="status">{message}</p>}
        <label><input className="w-auto" type="checkbox" checked={confirmed} disabled={busy} onChange={e => setConfirmed(e.target.checked)} /> Delete the listed application-owned resumes and their analysis records</label>
        <button className="primary-button w-fit" disabled={!confirmed || busy || !deletable.length} onClick={() => void handleDelete()}>Delete {deletable.length} analyzer resumes</button>
    </main>;
}
export default function ProtectedWipe() { return <PrivateBoundary><WipeApp /></PrivateBoundary>; }
