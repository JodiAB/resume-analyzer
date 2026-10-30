import {type RouteConfig, index, route} from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route('/auth', 'routes/auth.tsx'),
    route('/upload', 'routes/upload.tsx'),
    route('/profile', 'routes/profile.tsx'),
    route('/jobs', 'routes/jobs.tsx'),
    route('/prepare', 'routes/prepare.tsx'),
    route('/applications', 'routes/applications.tsx'),
    route('/match/:source/:board/:jobId', 'routes/match.tsx'),
    route('/api/jobs', 'routes/api.jobs.ts'),
    route('/resume/:id', 'routes/resume.tsx'),
    route('/wipe', 'routes/wipe.tsx'),
] satisfies RouteConfig;
