import { create } from "zustand";
import { validFilePath } from './validation';

declare global {
    interface Window {
        puter: {
            auth: {
                getUser: () => Promise<PuterUser>;
                isSignedIn: () => Promise<boolean>;
                signIn: () => Promise<void>;
                signOut: () => Promise<void>;
            };
            fs: {
                stat: (path: string) => Promise<{ path: string }>;
                write: (
                    path: string,
                    data: string | File | Blob
                ) => Promise<File | undefined>;
                read: (path: string) => Promise<Blob>;
                upload: (file: File[] | Blob[], directory?: string, options?: { createMissingParents: boolean }) => Promise<FSItem>;
                delete: (path: string) => Promise<void>;
                readdir: (path: string) => Promise<FSItem[] | undefined>;
            };
            ai: {
                chat: (
                    prompt: string | ChatMessage[],
                    imageURL?: string | PuterChatOptions,
                    testMode?: boolean,
                    options?: PuterChatOptions
                ) => Promise<Object>;
                img2txt: (
                    image: string | File | Blob,
                    testMode?: boolean
                ) => Promise<string>;
            };
            kv: {
                get: (key: string) => Promise<string | null>;
                set: (key: string, value: string) => Promise<boolean>;
                del: (key: string) => Promise<boolean>;
                list: (pattern: string, returnValues?: boolean) => Promise<string[]>;
                flush: () => Promise<boolean>;
            };
        };
    }
}

interface PuterStore {
    isLoading: boolean;
    error: string | null;
    puterReady: boolean;
    auth: {
        user: PuterUser | null;
        isAuthenticated: boolean;
        signIn: () => Promise<void>;
        signOut: () => Promise<void>;
        refreshUser: () => Promise<void>;
        checkAuthStatus: () => Promise<boolean>;
        getUser: () => PuterUser | null;
    };
    fs: {
        write: (
            path: string,
            data: string | File | Blob
        ) => Promise<File | undefined>;
        read: (path: string) => Promise<Blob | undefined>;
        upload: (file: File[] | Blob[], directory?: string) => Promise<FSItem | undefined>;
        delete: (path: string) => Promise<void>;
        readDir: (path: string) => Promise<FSItem[] | undefined>;
    };
    ai: {
        chat: (
            prompt: string | ChatMessage[],
            imageURL?: string | PuterChatOptions,
            testMode?: boolean,
            options?: PuterChatOptions
        ) => Promise<AIResponse | undefined>;
        feedback: (
            path: string,
            message: string
        ) => Promise<AIResponse | undefined>;
        img2txt: (
            image: string | File | Blob,
            testMode?: boolean
        ) => Promise<string | undefined>;
    };
    kv: {
        get: (key: string) => Promise<string | null | undefined>;
        set: (key: string, value: string) => Promise<boolean | undefined>;
        delete: (key: string) => Promise<boolean | undefined>;
        list: (
            pattern: string,
            returnValues?: boolean
        ) => Promise<string[] | KVItem[] | undefined>;
        flush: () => Promise<boolean | undefined>;
    };

    init: () => (() => void);
    clearError: () => void;
}

const getPuter = (): typeof window.puter | null =>
    typeof window !== "undefined" && window.puter ? window.puter : null;

async function bounded<T>(promise: Promise<T>, milliseconds = 30000): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([promise, new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error('Puter request timed out. Its remote outcome may be unknown.')), milliseconds);
        })]);
    } finally { clearTimeout(timer); }
}

export const usePuterStore = create<PuterStore>((set, get) => {
    let epoch = 0;
    let initCleanup: (() => void) | undefined;
    const clearUser = () => set({ auth: { ...get().auth, user: null, isAuthenticated: false } });
    const failure = (message: string) => { clearUser(); set({ error: message, isLoading: false }); };
    const checkAuthStatus = async (): Promise<boolean> => {
        const ticket = ++epoch;
        clearUser();
        set({ isLoading: true, error: null });
        try {
            const sdk = getPuter();
            if (!sdk) throw new Error('Puter.js not available');
            const signedIn = await bounded(sdk.auth.isSignedIn());
            if (ticket !== epoch) return false;
            const user = signedIn ? await bounded(sdk.auth.getUser()) : null;
            if (ticket !== epoch) return false;
            if (user && !user.uuid) throw new Error('Invalid Puter user');
            set({ auth: { ...get().auth, user, isAuthenticated: Boolean(user) }, isLoading: false });
            return Boolean(user);
        } catch {
            if (ticket === epoch) failure('Unable to verify your Puter session. Please sign in again.');
            return false;
        }
    };
    const signIn = async () => {
        const ticket = ++epoch;
        clearUser(); set({ isLoading: true, error: null });
        try {
            const sdk = getPuter();
            if (!sdk) throw new Error('SDK unavailable');
            await bounded(sdk.auth.signIn(), 120000);
            if (ticket === epoch) await checkAuthStatus();
        } catch { if (ticket === epoch) failure('Sign in failed. Please retry.'); }
    };
    const signOut = async () => {
        const ticket = ++epoch;
        clearUser(); set({ isLoading: true, error: null });
        try {
            const sdk = getPuter();
            if (!sdk) throw new Error('SDK unavailable');
            await bounded(sdk.auth.signOut());
            if (ticket === epoch) set({ isLoading: false });
        } catch { if (ticket === epoch) failure('Sign out could not be confirmed. Private data is hidden; retry sign out.'); }
    };
    const refreshUser = async () => {
        const ticket = epoch;
        const owner = get().auth.user?.uuid;
        if (!owner || get().isLoading) return;
        try {
            const sdk = getPuter();
            const signedIn = sdk && await bounded(sdk.auth.isSignedIn());
            const user = signedIn && sdk ? await bounded(sdk.auth.getUser()) : null;
            if (ticket === epoch && user?.uuid !== owner) {
                ++epoch; failure('Your Puter account changed. Please sign in again.');
            }
        } catch { if (ticket === epoch) { ++epoch; failure('Unable to revalidate your session. Please sign in again.'); } }
    };
    const guarded = async <T,>(operation: (sdk: typeof window.puter, path?: string) => Promise<T>, milliseconds = 30000, file?: { path: string; allowRoot?: boolean }): Promise<T> => {
        const state = get();
        const owner = state.auth.user?.uuid;
        const ticket = epoch;
        const sdk = getPuter();
        if (!sdk || state.isLoading || !state.auth.isAuthenticated || !owner) throw new Error('An authenticated session is required');
        const verifyOwner = async () => {
            let sdkOwner: string | undefined;
            try {
                if (await bounded(sdk.auth.isSignedIn())) sdkOwner = (await bounded(sdk.auth.getUser())).uuid;
            } catch {
                if (ticket === epoch) { ++epoch; failure('Unable to verify the active Puter account.'); }
                throw new Error('Session changed. Please sign in again.');
            }
            if (ticket !== epoch || get().auth.user?.uuid !== owner) throw new Error('Session changed; operation stopped');
            if (sdkOwner !== owner) {
                ++epoch; failure('Your Puter account changed. Please sign in again.');
                throw new Error('Session changed; operation stopped');
            }
        };
        await verifyOwner();
        let scopedPath: string | undefined;
        if (file) {
            const root = (await bounded(sdk.fs.stat('.'))).path.replace(/\/$/, '');
            await verifyOwner();
            if (!validFilePath(root) || !/^\/[^/]+\/AppData\/[^/]+$/.test(root)) throw new Error('Cannot verify application storage ownership');
            const relative = file.path.replace(/^\.\//, '').replace(/\/$/, '');
            const isRoot = relative === '' || relative === '.' || relative === root;
            if (isRoot && !file.allowRoot) throw new Error('Root file operations are forbidden');
            scopedPath = isRoot ? root : relative.startsWith('/') ? relative : `${root}/${relative}`;
            if (!validFilePath(scopedPath) || (scopedPath !== root && !scopedPath.startsWith(root + '/'))) throw new Error('File is outside the authenticated application storage');
        }
        const result = await bounded(operation(sdk, scopedPath), milliseconds);
        // A focus event is not guaranteed while a request is pending. Recheck the
        // SDK itself before returning private data or authorizing the next stage.
        await verifyOwner();
        if (ticket !== epoch || !get().auth.isAuthenticated || get().auth.user?.uuid !== owner) throw new Error('Session changed; result discarded');
        return result;
    };
    const init = () => {
        initCleanup?.();
        let stopped = false;
        const ready = () => {
            if (stopped || !getPuter()) return;
            stopTimers();
            set({ puterReady: true });
            void checkAuthStatus();
        };
        const interval = setInterval(ready, 100);
        const timeout = setTimeout(() => { stopTimers(); failure('Puter.js failed to load. Reload to retry.'); }, 10000);
        const stopTimers = () => { clearInterval(interval); clearTimeout(timeout); };
        const cleanup = () => { stopped = true; stopTimers(); ++epoch; clearUser(); };
        initCleanup = cleanup;
        ready();
        return cleanup;
    };
    return {
        isLoading: true, error: null, puterReady: false,
        auth: { user: null, isAuthenticated: false, signIn, signOut, refreshUser, checkAuthStatus, getUser: () => get().auth.user },
        fs: {
            write: (path, data) => guarded((sdk, scoped) => sdk.fs.write(scoped!, data), 30000, { path }),
            read: path => guarded((sdk, scoped) => sdk.fs.read(scoped!), 30000, { path }),
            readDir: path => guarded((sdk, scoped) => sdk.fs.readdir(scoped!), 30000, { path, allowRoot: true }),
            upload: (files, directory = '.') => guarded((sdk, scoped) => sdk.fs.upload(files, scoped, { createMissingParents: true }), 30000, { path: directory, allowRoot: true }),
            delete: path => guarded((sdk, scoped) => sdk.fs.delete(scoped!), 30000, { path }),
        },
        ai: {
            chat: (prompt, imageURL, testMode, options) => guarded(sdk => sdk.ai.chat(prompt, imageURL, testMode, options) as Promise<AIResponse>, 120000),
            feedback: (path, message) => guarded((sdk, scoped) => sdk.ai.chat([{ role: 'user', content: [{ type: 'file', puter_path: scoped! }, { type: 'text', text: message }] }], { model: 'grok-3' }) as Promise<AIResponse>, 120000, { path }),
            img2txt: (image, testMode) => guarded(sdk => sdk.ai.img2txt(image, testMode), 120000),
        },
        kv: {
            get: key => guarded(sdk => sdk.kv.get(key)),
            set: (key, value) => guarded(sdk => sdk.kv.set(key, value)),
            delete: key => guarded(sdk => sdk.kv.del(key)),
            list: (pattern, returnValues = false) => guarded(sdk => sdk.kv.list(pattern, returnValues)),
            flush: async () => { throw new Error('Broad deletion is disabled. Use scoped resume deletion.'); },
        },
        init, clearError: () => set({ error: null }),
    };
});

// Capture once per UI operation; every asynchronous stage checks the same session.
export function captureSession(): () => void {
    const state = usePuterStore.getState();
    const owner = state.auth.user?.uuid;
    const auth = state.auth;
    const assert = () => {
        const current = usePuterStore.getState();
        if (!owner || current.isLoading || !current.auth.isAuthenticated || current.auth !== auth || current.auth.user?.uuid !== owner) throw new Error('Session changed. Please sign in and retry.');
    };
    assert();
    return assert;
}
