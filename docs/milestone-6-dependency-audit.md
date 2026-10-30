# Milestone 6 dependency security ledger

Fresh npm registry advisory evidence; initial inventory 29 October 2026, final graph 2026-10-30. Thirty vulnerable package entries are not thirty unique advisories; every direct advisory and inherited dependency is retained below. No active exploit attack was performed. Exposure assessments are code/configuration review, not proof of unexploitable code.

Before: {"info":0,"low":1,"moderate":3,"high":18,"critical":8,"total":30}. After: {"info":0,"low":0,"moderate":1,"high":0,"critical":2,"total":3}.

Router family7.18.5, Vite6.4.5 and Vitest3.2.7 remain within existing majors. Unrelated direct dependency versions were pinned during isolated resolution; normal npm ci succeeded without force/legacy-peer-deps. Three residual development entries require a reviewed Vitest major upgrade.

## @babel/core — low

Transitive dependency. Affected aggregate range: `<=7.29.0`.

Installed before: `7.28.0` (development; node_modules/@babel/core).

Installed after: `7.29.7` (development).

Exposure/exploitability: Build-time transpilation. Source-map comments are relevant when compiling untrusted repository source; candidate/job text is not compiled as JavaScript. No hostile-source exploit attempted.

Safe remediation: Updated/removed through compatible same-major package family and transitive patches; verify full regression before acceptance.

Remaining risk: No longer reported by current npm audit for resolved graph. This is not a guarantee against unknown flaws or a deployment certification.

Advisories / inheritance:

- [@babel/core: Arbitrary File Read via sourceMappingURL Comment](https://github.com/advisories/GHSA-4x5r-pxfx-6jf8) — severity low, affected `<=7.29.0`.

## @react-router/dev — critical

Direct dependency. Affected aggregate range: `<=7.9.3`.

Installed before: `7.7.0` (development; node_modules/@react-router/dev).

Installed after: `7.18.5` (development).

Exposure/exploitability: Development/build package; inherits Router/node/Valibot findings. Do not expose the dev server. Framework server behavior also depends on production Router packages.

Safe remediation: Updated/removed through compatible same-major package family and transitive patches; verify full regression before acceptance.

Remaining risk: No longer reported by current npm audit for resolved graph. This is not a guarantee against unknown flaws or a deployment certification.

Advisories / inheritance:

- Inherits `@react-router/node`; see that package entry.
- Inherits `valibot`; see that package entry.

## @react-router/express — critical

Transitive dependency. Affected aggregate range: `<=7.11.0`.

Installed before: `7.7.0` (production or optional runtime; node_modules/@react-router/express).

Installed after: `7.18.5` (production or optional runtime).

Exposure/exploitability: Production serve adapter; inherits Router and node defects. Public routes are reachable without authentication even though private records remain client-side.

Safe remediation: Updated/removed through compatible same-major package family and transitive patches; verify full regression before acceptance.

Remaining risk: No longer reported by current npm audit for resolved graph. This is not a guarantee against unknown flaws or a deployment certification.

Advisories / inheritance:

- Inherits `@react-router/node`; see that package entry.
- Inherits `react-router`; see that package entry.

## @react-router/node — critical

Direct dependency. Affected aggregate range: `<=7.11.0`.

Installed before: `7.7.0` (production or optional runtime; node_modules/@react-router/node).

Installed after: `7.18.5` (production or optional runtime).

Exposure/exploitability: Production SSR/serve utilities. File-session storage is not configured, reducing that specific path traversal exposure; other inherited Router flaws still require remediation.

Safe remediation: Updated/removed through compatible same-major package family and transitive patches; verify full regression before acceptance.

Remaining risk: No longer reported by current npm audit for resolved graph. This is not a guarantee against unknown flaws or a deployment certification.

Advisories / inheritance:

- [React Router has Path Traversal in File Session Storage](https://github.com/advisories/GHSA-9583-h5hc-x8cw) — severity critical, affected `>=7.0.0 <=7.9.3`.
- Inherits `react-router`; see that package entry.

## @react-router/serve — critical

Direct dependency. Affected aggregate range: `<=7.11.0`.

Installed before: `7.7.0` (production or optional runtime; node_modules/@react-router/serve).

Installed after: `7.18.5` (production or optional runtime).

Exposure/exploitability: Production HTTP entry point. Inherits Express/node/Router vulnerabilities; private client storage does not neutralize public server vulnerabilities.

Safe remediation: Updated/removed through compatible same-major package family and transitive patches; verify full regression before acceptance.

Remaining risk: No longer reported by current npm audit for resolved graph. This is not a guarantee against unknown flaws or a deployment certification.

Advisories / inheritance:

- Inherits `@react-router/express`; see that package entry.
- Inherits `@react-router/node`; see that package entry.
- Inherits `react-router`; see that package entry.

## @vitest/mocker — moderate

Transitive dependency. Affected aggregate range: `<=4.1.11`.

Installed before: `3.2.4` (development; node_modules/@vitest/mocker).

Installed after: `3.2.7` (development).

Exposure/exploitability: Development mock server. Tests use vitest run, without a publicly listening Vitest UI/mock endpoint. No adversarial exploit certification; retain the finding and prohibit exposing test servers.

Safe remediation: Same-major patch applied where available; full remediation currently proposed by npm requires a Vitest major upgrade. Do not force or override incompatible internals.

Remaining risk: OPEN: known advisory persists. Restrict development tooling to trusted local sources; no public test endpoints. Major migration requires separate review.

Advisories / inheritance:

- [Vitest: Path Traversal / Arbitrary File Read via @vitest/mocker Redirect Mock](https://github.com/advisories/GHSA-82fw-gwwq-j7x9) — severity moderate, affected `>=2.1.0 <4.1.11`.
- [Vitest: Code injection via unauthenticated manual mock registration](https://github.com/advisories/GHSA-qxg6-89mg-rqv8) — severity moderate, affected `>=2.1.0-beta.7 <4.1.12`.

## body-parser — high

Transitive dependency. Affected aggregate range: `<=1.20.8 || 2.0.0-beta.1 - 2.0.2`.

Installed before: `1.20.3` (production or optional runtime; node_modules/body-parser).

Installed after: `1.20.9` (production or optional runtime).

Exposure/exploitability: Production Express request parsing chain. Hostile compressed/request-body traffic can affect an exposed server; no live DoS attempt performed.

Safe remediation: Updated/removed through compatible same-major package family and transitive patches; verify full regression before acceptance.

Remaining risk: No longer reported by current npm audit for resolved graph. This is not a guarantee against unknown flaws or a deployment certification.

Advisories / inheritance:

- [body-parser vulnerable to denial of service when invalid limit value silently disables size enforcement](https://github.com/advisories/GHSA-v422-hmwv-36x6) — severity low, affected `<1.20.6`.
- [body-parser vulnerable to Denial of Service via trailing bytes after a compressed request body](https://github.com/advisories/GHSA-27r3-jxmh-p828) — severity high, affected `<1.20.9`.
- Inherits `qs`; see that package entry.

## brace-expansion — high

Transitive dependency. Affected aggregate range: `2.0.0 - 2.1.6`.

Installed before: `2.0.2` (development; node_modules/brace-expansion).

Installed after: removed.

Exposure/exploitability: Build-time glob expansion. App does not accept user-controlled glob patterns; repository/tooling input can still trigger resource exhaustion.

Safe remediation: Updated/removed through compatible same-major package family and transitive patches; verify full regression before acceptance.

Remaining risk: No longer reported by current npm audit for resolved graph. This is not a guarantee against unknown flaws or a deployment certification.

Advisories / inheritance:

- [brace-expansion: Zero-step sequence causes process hang and memory exhaustion](https://github.com/advisories/GHSA-f886-m6hf-6m8v) — severity moderate, affected `>=2.0.0 <2.0.3`.
- [brace-expansion: DoS via exponential-time expansion of consecutive non-expanding {} groups](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp) — severity high, affected `>=2.0.0 <2.1.2`.
- [brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash](https://github.com/advisories/GHSA-mh99-v99m-4gvg) — severity high, affected `>=2.0.0 <2.1.3`.
- [brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation](https://github.com/advisories/GHSA-rgw5-rvv9-x895) — severity high, affected `>=2.0.0 <2.1.4`.
- [brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) — severity moderate, affected `>=2.0.0 <2.1.7`.
- [brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion](https://github.com/advisories/GHSA-qhr7-859c-m2p7) — severity high, affected `>=2.0.0 <2.1.6`.
- [brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) — severity high, affected `>=2.0.0 <2.1.5`.

## browserslist — high

Transitive dependency. Affected aggregate range: `<=4.28.6`.

Installed before: `4.25.1` (development; node_modules/browserslist).

Installed after: `4.29.5` (development).

Exposure/exploitability: Build-time browser-target queries/stats. Candidate text is not a Browserslist config; malicious repository stats/config remain a concern.

Safe remediation: Updated/removed through compatible same-major package family and transitive patches; verify full regression before acceptance.

Remaining risk: No longer reported by current npm audit for resolved graph. This is not a guarantee against unknown flaws or a deployment certification.

Advisories / inheritance:

- [Browserslist: Unbounded memory growth (no cache eviction) via distinct query results, leading to eventual OOM](https://github.com/advisories/GHSA-c83g-rgw3-j3cx) — severity high, affected `<=4.28.6`.
- [Browserslist: Uncaught crash / prototype write via untrusted browserslist-stats.json custom stats (normalizeStats)](https://github.com/advisories/GHSA-73wf-gq98-2v4g) — severity high, affected `<=4.28.6`.

## compression — high

Transitive dependency. Affected aggregate range: `<1.8.2`.

Installed before: `1.8.1` (production or optional runtime; node_modules/compression).

Installed after: `1.8.2` (production or optional runtime).

Exposure/exploitability: Production serve compression middleware; premature closes are plausible on an exposed HTTP server. Treat memory exhaustion as relevant, not dismissed.

Safe remediation: Updated/removed through compatible same-major package family and transitive patches; verify full regression before acceptance.

Remaining risk: No longer reported by current npm audit for resolved graph. This is not a guarantee against unknown flaws or a deployment certification.

Advisories / inheritance:

- [compression vulnerable to Denial of Service via memory leak on premature response close](https://github.com/advisories/GHSA-vc2v-76pw-4v95) — severity high, affected `<1.8.2`.

## express — high

Transitive dependency. Affected aggregate range: `4.0.0-rc1 - 4.22.2 || 5.0.0-alpha.1 - 5.0.1`.

Installed before: `4.21.2` (production or optional runtime; node_modules/express).

Installed after: `4.22.3` (production or optional runtime).

Exposure/exploitability: Production HTTP server. Routes/request parsing/query parameters are externally reachable; inherited body-parser/path-to-regexp/qs findings require patches.

Safe remediation: Updated/removed through compatible same-major package family and transitive patches; verify full regression before acceptance.

Remaining risk: No longer reported by current npm audit for resolved graph. This is not a guarantee against unknown flaws or a deployment certification.

Advisories / inheritance:

- Inherits `body-parser`; see that package entry.
- Inherits `path-to-regexp`; see that package entry.
- Inherits `qs`; see that package entry.

## glob — high

Transitive dependency. Affected aggregate range: `10.2.0 - 10.4.5`.

Installed before: `10.4.5` (development; node_modules/glob).

Installed after: removed.

Exposure/exploitability: Development/build CLI chain. App never invokes glob --cmd on uploaded file names. Malicious source/tooling invocation remains possible; no exploit attempted.

Safe remediation: Updated/removed through compatible same-major package family and transitive patches; verify full regression before acceptance.

Remaining risk: No longer reported by current npm audit for resolved graph. This is not a guarantee against unknown flaws or a deployment certification.

Advisories / inheritance:

- [glob CLI: Command injection via -c/--cmd executes matches with shell:true](https://github.com/advisories/GHSA-5j98-mcp5-4vw2) — severity high, affected `>=10.2.0 <10.5.0`.

## lodash — high

Transitive dependency. Affected aggregate range: `<=4.17.23`.

Installed before: `4.17.21` (development; node_modules/lodash).

Installed after: `4.18.1` (development).

Exposure/exploitability: Build/tooling transitive utility. App does not call template/unset/omit on candidate data; affected upstream callers require contextual review rather than blanket immunity.

Safe remediation: Updated/removed through compatible same-major package family and transitive patches; verify full regression before acceptance.

Remaining risk: No longer reported by current npm audit for resolved graph. This is not a guarantee against unknown flaws or a deployment certification.

Advisories / inheritance:

- [lodash vulnerable to Code Injection via `_.template` imports key names](https://github.com/advisories/GHSA-r5fr-rjxr-66jc) — severity high, affected `>=4.0.0 <=4.17.23`.
- [lodash vulnerable to Prototype Pollution via array path bypass in `_.unset` and `_.omit`](https://github.com/advisories/GHSA-f23m-r3pf-42rh) — severity moderate, affected `<=4.17.23`.
- [Lodash has Prototype Pollution Vulnerability in `_.unset` and `_.omit` functions](https://github.com/advisories/GHSA-xxjr-mmjv-4gpg) — severity moderate, affected `>=4.0.0 <=4.17.22`.

## minimatch — high

Transitive dependency. Affected aggregate range: `9.0.0 - 9.0.6`.

Installed before: `9.0.5` (development; node_modules/minimatch).

Installed after: removed.

Exposure/exploitability: Build-time glob matching. No candidate/job text becomes a glob; crafted repository patterns can still exhaust resources.

Safe remediation: Updated/removed through compatible same-major package family and transitive patches; verify full regression before acceptance.

Remaining risk: No longer reported by current npm audit for resolved graph. This is not a guarantee against unknown flaws or a deployment certification.

Advisories / inheritance:

- [minimatch has a ReDoS via repeated wildcards with non-matching literal in pattern](https://github.com/advisories/GHSA-3ppc-4f35-3m26) — severity high, affected `>=9.0.0 <9.0.6`.
- [minimatch has ReDoS: matchOne() combinatorial backtracking via multiple non-adjacent GLOBSTAR segments](https://github.com/advisories/GHSA-7r86-cg39-jmmj) — severity high, affected `>=9.0.0 <9.0.7`.
- [minimatch ReDoS: nested *() extglobs generate catastrophically backtracking regular expressions](https://github.com/advisories/GHSA-23c5-xmqv-rm74) — severity high, affected `>=9.0.0 <9.0.7`.

## morgan — moderate

Transitive dependency. Affected aggregate range: `<=1.12.0`.

Installed before: `1.10.1` (production or optional runtime; node_modules/morgan).

Installed after: `1.12.1` (production or optional runtime).

Exposure/exploitability: Production access logger via serve. Attacker-controlled request text can forge log fields; no sensitive document bodies should enter access logs.

Safe remediation: Updated/removed through compatible same-major package family and transitive patches; verify full regression before acceptance.

Remaining risk: No longer reported by current npm audit for resolved graph. This is not a guarantee against unknown flaws or a deployment certification.

Advisories / inheritance:

- [morgan vulnerable to Log Forging via unneutralized control characters in :remote-user](https://github.com/advisories/GHSA-4vj7-5mj6-jm8m) — severity moderate, affected `>=1.2.0 <=1.10.1`.
- [morgan vulnerable to Log Forging via unescaped Unicode line separators](https://github.com/advisories/GHSA-jxfw-x594-9x9m) — severity moderate, affected `<1.12.0`.
- [morgan vulnerable to Log Injection via unescaped double quote in quoted log fields](https://github.com/advisories/GHSA-9f6g-j8ch-79g4) — severity moderate, affected `<1.12.1`.

## nanoid — high

Transitive dependency. Affected aggregate range: `<=3.3.17`.

Installed before: `6.0.2` (production or optional runtime; node_modules/docx/node_modules/nanoid); `3.3.11` (development; node_modules/nanoid).

Installed after: `6.0.2` (production or optional runtime); `3.3.20` (development).

Exposure/exploitability: Build-time PostCSS ID chain. App uses crypto.randomUUID for application identities. Invalid custom generator sizes are not supplied by the app; patched regardless.

Safe remediation: Updated/removed through compatible same-major package family and transitive patches; verify full regression before acceptance.

Remaining risk: No longer reported by current npm audit for resolved graph. This is not a guarantee against unknown flaws or a deployment certification.

Advisories / inheritance:

- [nanoid: non-secure generators can loop indefinitely with negative size](https://github.com/advisories/GHSA-28wg-ghj8-5hjv) — severity high, affected `<3.3.16`.
- [nanoid: custom generators can loop indefinitely when size is zero](https://github.com/advisories/GHSA-2v37-7h3g-55p8) — severity high, affected `<3.3.18`.
- [nanoid: Integer Overflow or Wraparound](https://github.com/advisories/GHSA-xwg4-73v4-xw9w) — severity high, affected `<3.3.12`.

## path-to-regexp — high

Transitive dependency. Affected aggregate range: `<0.1.13`.

Installed before: `0.1.12` (production or optional runtime; node_modules/path-to-regexp).

Installed after: `0.1.13` (production or optional runtime).

Exposure/exploitability: Production Express route matcher. Fixed literal application routes reduce some pattern triggers but public requests still reach the matcher.

Safe remediation: Updated/removed through compatible same-major package family and transitive patches; verify full regression before acceptance.

Remaining risk: No longer reported by current npm audit for resolved graph. This is not a guarantee against unknown flaws or a deployment certification.

Advisories / inheritance:

- [path-to-regexp vulnerable to Regular Expression Denial of Service via multiple route parameters](https://github.com/advisories/GHSA-37ch-88jc-xwx2) — severity high, affected `<0.1.13`.

## picomatch — high

Transitive dependency. Affected aggregate range: `4.0.0 - 4.0.3`.

Installed before: `4.0.3` (development; node_modules/picomatch).

Installed after: `4.0.7` (development).

Exposure/exploitability: Build-time matching chain. Repository patterns are the relevant input; candidate strings are not executable glob patterns.

Safe remediation: Updated/removed through compatible same-major package family and transitive patches; verify full regression before acceptance.

Remaining risk: No longer reported by current npm audit for resolved graph. This is not a guarantee against unknown flaws or a deployment certification.

Advisories / inheritance:

- [Picomatch: Method Injection in POSIX Character Classes causes incorrect Glob Matching](https://github.com/advisories/GHSA-3v7f-55p6-f55p) — severity moderate, affected `>=4.0.0 <4.0.4`.
- [Picomatch has a ReDoS vulnerability via extglob quantifiers](https://github.com/advisories/GHSA-c2c7-rcm5-vvqj) — severity high, affected `>=4.0.0 <4.0.4`.

## postcss — high

Transitive dependency. Affected aggregate range: `<=8.5.22`.

Installed before: `8.5.6` (development; node_modules/postcss).

Installed after: `8.5.32` (development).

Exposure/exploitability: Build-time CSS processing. Uploaded CV/job text is not CSS; hostile repository CSS/source-map comments can still read files or inject output.

Safe remediation: Updated/removed through compatible same-major package family and transitive patches; verify full regression before acceptance.

Remaining risk: No longer reported by current npm audit for resolved graph. This is not a guarantee against unknown flaws or a deployment certification.

Advisories / inheritance:

- [PostCSS has XSS via Unescaped </style> in its CSS Stringify Output](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) — severity moderate, affected `<8.5.10`.
- [PostCSS: Arbitrary file read and information disclosure via attacker-controlled sourceMappingURL in CSS comments](https://github.com/advisories/GHSA-6g55-p6wh-862q) — severity high, affected `<=8.5.11`.
- [PostCSS: incomplete fix of GHSA-6g55-p6wh-862q — attacker-controlled sourceMappingURL reads arbitrary .map files when `from` is unset](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) — severity moderate, affected `<=8.5.22`.
- [PostCSS: Path Traversal in Previous Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure](https://github.com/advisories/GHSA-r28c-9q8g-f849) — severity high, affected `<=8.5.17`.

## proxy-addr — critical

Transitive dependency. Affected aggregate range: `1.1.0 - 2.0.7`.

Installed before: `2.0.7` (production or optional runtime; node_modules/proxy-addr).

Installed after: `2.0.8` (production or optional runtime).

Exposure/exploitability: Production Express proxy address resolution. App does not base owner authorization on client IP; deployment proxy trust must still be reviewed, not assumed secure.

Safe remediation: Updated/removed through compatible same-major package family and transitive patches; verify full regression before acceptance.

Remaining risk: No longer reported by current npm audit for resolved graph. This is not a guarantee against unknown flaws or a deployment certification.

Advisories / inheritance:

- [proxy-addr vulnerable to IP spoofing via IPv4-mapped IPv6 trust subnet](https://github.com/advisories/GHSA-jqcg-44mw-7w3h) — severity critical, affected `>=1.1.0 <2.0.8`.

## qs — moderate

Transitive dependency. Affected aggregate range: `<=6.16.0`.

Installed before: `6.13.0` (production or optional runtime; node_modules/qs).

Installed after: `6.16.2` (production or optional runtime).

Exposure/exploitability: Production Express query/body parsing. Incoming query parameters are untrusted; parsing DoS is relevant to hosting. No production attack traffic generated.

Safe remediation: Updated/removed through compatible same-major package family and transitive patches; verify full regression before acceptance.

Remaining risk: No longer reported by current npm audit for resolved graph. This is not a guarantee against unknown flaws or a deployment certification.

Advisories / inheritance:

- [qs's arrayLimit bypass in comma parsing allows denial of service](https://github.com/advisories/GHSA-w7fw-mjwx-w883) — severity low, affected `>=6.7.0 <=6.14.1`.
- [qs's arrayLimit bypass in its bracket notation allows DoS via memory exhaustion](https://github.com/advisories/GHSA-6rw7-vpxm-498p) — severity moderate, affected `<6.14.1`.
- [qs has a remotely triggerable DoS: qs.stringify crashes with TypeError on null/undefined entries in comma-format arrays when encodeValuesOnly is set](https://github.com/advisories/GHSA-q8mj-m7cp-5q26) — severity moderate, affected `>=6.11.1 <=6.15.1`.
- [qs: Denial of Service via Attacker Controlled isBuffer](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g) — severity moderate, affected `>=2.2.5 <6.16.0`.
- [qs : qs.stringify with arrayFormat 'comma' throws an uncaught TypeError on array elements carrying a non-callable own toString (DoS)](https://github.com/advisories/GHSA-6pq8-jhm2-2vcw) — severity moderate, affected `>=6.7.0 <=6.16.0`.

## react-router — high

Direct dependency. Affected aggregate range: `6.0.0 - 7.17.0`.

Installed before: `7.7.0` (production or optional runtime; node_modules/react-router).

Installed after: `7.18.5` (production or optional runtime).

Exposure/exploitability: Production SSR/client routing. Public manifest/routing/deserialization/redirect surfaces need patched framework even without server-side personal records. RSC is not configured and app next-path validation narrows its own redirects; this does not dismiss framework advisories.

Safe remediation: Updated/removed through compatible same-major package family and transitive patches; verify full regression before acceptance.

Remaining risk: No longer reported by current npm audit for resolved graph. This is not a guarantee against unknown flaws or a deployment certification.

Advisories / inheritance:

- [React Router vulnerable to XSS via Open Redirects](https://github.com/advisories/GHSA-2w69-qvjg-hvjx) — severity high, affected `>=7.0.0 <=7.11.0`.
- [React Router has unexpected external redirect via untrusted paths](https://github.com/advisories/GHSA-9jcx-v3wj-wh4m) — severity moderate, affected `>=7.0.0 <7.9.6`.
- [React Router's vendored turbo-stream v2 allows arbitrary constructor invocation via TYPE_ERROR deserialization leading to Unauth RCE](https://github.com/advisories/GHSA-49rj-9fvp-4h2h) — severity high, affected `>=7.0.0 <=7.14.1`.
- [React Router vulnerable to XSS in unstable RSC redirect handling via javascript: redirect targets](https://github.com/advisories/GHSA-8646-j5j9-6r62) — severity high, affected `>=7.7.0 <7.13.2`.
- [React Router vulnerable to DoS via unbounded path expansion in __manifest endpoint](https://github.com/advisories/GHSA-8x6r-g9mw-2r78) — severity high, affected `>=7.0.0 <7.15.0`.
- [React Router vulnerable to Denial of Service via reflected user input in single-fetch](https://github.com/advisories/GHSA-rxv8-25v2-qmq8) — severity high, affected `>=7.0.0 <7.14.0`.
- [React Router has CSRF issue in Action/Server Action Request Processing](https://github.com/advisories/GHSA-h5cw-625j-3rxh) — severity moderate, affected `>=7.0.0 <=7.11.0`.
- [React Router: Open redirect via backslash in <Link> and useNavigate (CVE-2025-68470 bypass)](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6) — severity moderate, affected `>=6.0.0 <7.18.0`.
- [React Router: Arbitrary Constructor Injection via deserializeErrors() in React Router SSR Hydration](https://github.com/advisories/GHSA-337j-9hxr-rhxg) — severity moderate, affected `>=6.4.0 <7.18.0`.
- [React Router: Unauthenticated Denial of Service via Inefficient Route Matching](https://github.com/advisories/GHSA-chx6-hx7r-mcp5) — severity high, affected `>=7.0.0 <7.18.0`.
- [React Router's same-origin redirect with path starting // causes open redirect via protocol-relative URL reinterpretation](https://github.com/advisories/GHSA-2j2x-hqr9-3h42) — severity moderate, affected `>=7.0.0 <7.14.1`.
- [React Router has stored XSS via unescaped Location header in prerendered redirect HTML](https://github.com/advisories/GHSA-f22v-gfqf-p8f3) — severity moderate, affected `>=7.5.1 <7.13.2`.
- [React Router SSR XSS in ScrollRestoration](https://github.com/advisories/GHSA-8v8x-cx79-35w7) — severity high, affected `>=7.0.0 <7.12.0`.
- [React Router has XSS Vulnerability](https://github.com/advisories/GHSA-3cgp-3xvw-98x8) — severity high, affected `>=7.0.0 <=7.8.2`.

## react-router-dom — high

Direct dependency. Affected aggregate range: `7.0.0-pre.0 - 7.11.0`.

Installed before: `7.7.0` (production or optional runtime; node_modules/react-router-dom).

Installed after: `7.18.5` (production or optional runtime).

Exposure/exploitability: Production browser routing; inherits core Router redirect/hydration concerns. Validating our own links is not a substitute for patching.

Safe remediation: Updated/removed through compatible same-major package family and transitive patches; verify full regression before acceptance.

Remaining risk: No longer reported by current npm audit for resolved graph. This is not a guarantee against unknown flaws or a deployment certification.

Advisories / inheritance:

- Inherits `react-router`; see that package entry.

## rollup — high

Transitive dependency. Affected aggregate range: `4.0.0 - 4.58.0`.

Installed before: `4.45.1` (development; node_modules/rollup).

Installed after: `4.66.0` (development).

Exposure/exploitability: Build-time bundling and output files. Untrusted source/plugins can influence paths; CV/job text is not compiled as a plugin.

Safe remediation: Updated/removed through compatible same-major package family and transitive patches; verify full regression before acceptance.

Remaining risk: No longer reported by current npm audit for resolved graph. This is not a guarantee against unknown flaws or a deployment certification.

Advisories / inheritance:

- [Rollup 4 has Arbitrary File Write via Path Traversal](https://github.com/advisories/GHSA-mw96-cpmx-2vgc) — severity high, affected `>=4.0.0 <4.59.0`.

## source-map-js — high

Transitive dependency. Affected aggregate range: `1.0.0 - 1.2.1`.

Installed before: `1.2.1` (development; node_modules/source-map-js).

Installed after: `1.2.2` (development).

Exposure/exploitability: Build-time source-map parsing. No user-uploaded source map endpoint; hostile repository/plugin source maps remain relevant.

Safe remediation: Updated/removed through compatible same-major package family and transitive patches; verify full regression before acceptance.

Remaining risk: No longer reported by current npm audit for resolved graph. This is not a guarantee against unknown flaws or a deployment certification.

Advisories / inheritance:

- [source-map-js allows event-loop denial of service through indexed source-map section offsets](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) — severity high, affected `>=1.0.0 <1.2.2`.

## tar — critical

Transitive dependency. Affected aggregate range: `<=7.5.20`.

Installed before: `7.4.3` (development; node_modules/tar).

Installed after: `7.5.22` (development).

Exposure/exploitability: Build/tooling extraction dependency. App accepts PDF files, not tar archives, and has no archive extraction route. Developer tooling/supply-chain archives remain relevant.

Safe remediation: Updated/removed through compatible same-major package family and transitive patches; verify full regression before acceptance.

Remaining risk: No longer reported by current npm audit for resolved graph. This is not a guarantee against unknown flaws or a deployment certification.

Advisories / inheritance:

- [node-tar Vulnerable to Arbitrary File Creation/Overwrite via Hardlink Path Traversal](https://github.com/advisories/GHSA-34x7-hfp2-rc4v) — severity high, affected `<7.5.7`.
- [node-tar is Vulnerable to Arbitrary File Overwrite and Symlink Poisoning via Insufficient Path Sanitization](https://github.com/advisories/GHSA-8qq5-rm4j-mr97) — severity high, affected `<=7.5.2`.
- [Arbitrary File Read/Write via Hardlink Target Escape Through Symlink Chain in node-tar Extraction](https://github.com/advisories/GHSA-83g3-92jg-28cx) — severity high, affected `<7.5.8`.
- [tar has Hardlink Path Traversal via Drive-Relative Linkpath](https://github.com/advisories/GHSA-qffp-2rhf-9h96) — severity high, affected `<=7.5.9`.
- [node-tar Symlink Path Traversal via Drive-Relative Linkpath](https://github.com/advisories/GHSA-9ppj-qmqm-q256) — severity high, affected `<=7.5.10`.
- [Race Condition in node-tar Path Reservations via Unicode Ligature Collisions on macOS APFS](https://github.com/advisories/GHSA-r6q2-hw4h-h46w) — severity high, affected `<=7.5.3`.
- [node-tar applies PAX size override to intermediary GNU long-name/long-link headers, causing tar parser interpretation differential (file smuggling)](https://github.com/advisories/GHSA-vmf3-w455-68vh) — severity moderate, affected `<=7.5.15`.
- [node-tar: Process crash via PAX numeric path type confusion](https://github.com/advisories/GHSA-w8wr-v893-vjvp) — severity moderate, affected `<=7.5.17`.
- [node-tar: Decompression/parse DoS via unlimited input](https://github.com/advisories/GHSA-23hp-3jrh-7fpw) — severity critical, affected `<=7.5.18`.
- [node-tar: Negative tar entry size causes infinite loop in archive replace](https://github.com/advisories/GHSA-8x88-c5mf-7j5w) — severity high, affected `<=7.5.17`.
- [node-tar: Uncaught Exception DoS via NUL byte in PAX path/linkpath records](https://github.com/advisories/GHSA-gvwx-54wh-qm9j) — severity moderate, affected `<=7.5.16`.
- [node-tar: Uncontrolled recursion in mapHas/filesFilter allows uncatchable stack-overflow DoS via crafted long-path tar with member selection](https://github.com/advisories/GHSA-r292-9mhp-454m) — severity high, affected `<=7.5.20`.

## tinypool — critical

Transitive dependency. Affected aggregate range: `<=2.1.1`.

Installed before: `1.1.1` (development; node_modules/tinypool).

Installed after: `1.1.1` (development).

Exposure/exploitability: Development worker pool. Prototype-pollution gadgets require attacker-influenced worker/run options or a polluted upstream prototype. App candidate inputs are not worker options. Critical advisory remains; no exploit proof or dismissal.

Safe remediation: Same-major patch applied where available; full remediation currently proposed by npm requires a Vitest major upgrade. Do not force or override incompatible internals.

Remaining risk: OPEN: known advisory persists. Restrict development tooling to trusted local sources; no public test endpoints. Major migration requires separate review.

Advisories / inheritance:

- [Tinypool: Prototype Pollution gadget in worker options leads to Remote Code Execution](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3) — severity critical, affected `<=2.1.0`.
- [Tinypool: Prototype Pollution Gadget to RCE in run() options](https://github.com/advisories/GHSA-85c8-ppgw-ccpr) — severity critical, affected `<2.1.2`.

## valibot — high

Transitive dependency. Affected aggregate range: `<=1.4.1`.

Installed before: `0.41.0` (development; node_modules/valibot).

Installed after: `1.5.0` (development).

Exposure/exploitability: Build/dev config-validation dependency. Application evidence validation is custom, not Valibot EMOJI_REGEX/record flattening. Hostile tooling input is still relevant.

Safe remediation: Updated/removed through compatible same-major package family and transitive patches; verify full regression before acceptance.

Remaining risk: No longer reported by current npm audit for resolved graph. This is not a guarantee against unknown flaws or a deployment certification.

Advisories / inheritance:

- [Valibot has a ReDoS vulnerability in `EMOJI_REGEX`](https://github.com/advisories/GHSA-vqpr-j7v3-hqw9) — severity high, affected `>=0.31.0 <1.2.0`.
- [Valibot: record() issue paths can make flatten() throw for inherited Object property names](https://github.com/advisories/GHSA-5qjj-4xww-7phc) — severity moderate, affected `<=1.4.1`.

## vite — high

Direct dependency. Affected aggregate range: `<=6.4.3`.

Installed before: `6.3.5` (development; node_modules/vite).

Installed after: `6.4.5` (development).

Exposure/exploitability: Development server/build. Windows file-access/editor and WebSocket issues are relevant on this Windows host. Bind loopback only; never deploy Vite dev as a production server.

Safe remediation: Updated/removed through compatible same-major package family and transitive patches; verify full regression before acceptance.

Remaining risk: No longer reported by current npm audit for resolved graph. This is not a guarantee against unknown flaws or a deployment certification.

Advisories / inheritance:

- [Vite middleware may serve files starting with the same name with the public directory](https://github.com/advisories/GHSA-g4jq-h2w9-997c) — severity low, affected `>=6.0.0 <=6.3.5`.
- [Vite's `server.fs` settings were not applied to HTML files](https://github.com/advisories/GHSA-jqfw-vq24-v9c3) — severity low, affected `>=6.0.0 <=6.3.5`.
- [vite allows server.fs.deny bypass via backslash on Windows](https://github.com/advisories/GHSA-93m4-6634-74q7) — severity moderate, affected `>=6.0.0 <=6.4.0`.
- [Vite Vulnerable to Path Traversal in Optimized Deps `.map` Handling](https://github.com/advisories/GHSA-4w7w-66w2-5vf9) — severity moderate, affected `<=6.4.1`.
- [Vite Vulnerable to Arbitrary File Read via Vite Dev Server WebSocket](https://github.com/advisories/GHSA-p9ff-h696-f583) — severity high, affected `>=6.0.0 <=6.4.1`.
- [launch-editor: NTLMv2 hash disclosure via UNC path handling on Windows](https://github.com/advisories/GHSA-v6wh-96g9-6wx3) — severity moderate, affected `<=6.4.2`.
- [launch-editor: escapeCmdArgs() omits % escaping on Windows](https://github.com/advisories/GHSA-698v-4r3x-3vcv) — severity moderate, affected `<=6.4.3`.
- [launch-editor: Editor CLI flag misinterpretation causing arbitrary command execution for some editors](https://github.com/advisories/GHSA-r825-w8mm-5pxw) — severity moderate, affected `<=6.4.3`.
- [launch-editor: `fs.existsSync()` existence check can be bypassed on Windows](https://github.com/advisories/GHSA-587h-7wmj-h5pm) — severity high, affected `<=6.4.3`.
- [Vite: Cross origin script execution through Vite custom middleware](https://github.com/advisories/GHSA-9jrq-w75r-8gcw) — severity low, affected `<=6.4.3`.
- [Vite: Files outside `server.fs.allow` could be served when project paths match system paths on non-Windows machine](https://github.com/advisories/GHSA-rq7h-c2jc-7f22) — severity moderate, affected `<=6.4.3`.
- [vite: `server.fs.deny` bypass on Windows alternate paths](https://github.com/advisories/GHSA-fx2h-pf6j-xcff) — severity moderate, affected `<=6.4.2`.

## vitest — critical

Direct dependency. Affected aggregate range: `<=4.1.10`.

Installed before: `3.2.4` (development; node_modules/vitest).

Installed after: `3.2.7` (development).

Exposure/exploitability: Development test runner; aggregate mocker/Tinypool findings remain. vitest run is not a public UI server; local testing of untrusted code is still an exposure. Major upgrade deferred under user restriction.

Safe remediation: Same-major patch applied where available; full remediation currently proposed by npm requires a Vitest major upgrade. Do not force or override incompatible internals.

Remaining risk: OPEN: known advisory persists. Restrict development tooling to trusted local sources; no public test endpoints. Major migration requires separate review.

Advisories / inheritance:

- Inherits `@vitest/mocker`; see that package entry.
- [When Vitest UI server is listening, arbitrary file can be read and executed](https://github.com/advisories/GHSA-5xrq-8626-4rwp) — severity critical, affected `<3.2.6`.
- [Vitest: Path Traversal / Arbitrary File Read via @vitest/mocker Redirect Mock](https://github.com/advisories/GHSA-82fw-gwwq-j7x9) — severity moderate, affected `>=2.1.0 <4.1.11`.
- Inherits `tinypool`; see that package entry.
